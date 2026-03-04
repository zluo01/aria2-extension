/**
 * Tests for the low-level Aria2 JSON-RPC service.
 *
 * Protocol reference: https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface
 *
 * Key protocol rules exercised here:
 *   - Token auth: first param is always "token:<secret>"
 *   - addUri URI list is wrapped in an array: params=[["http://..."], {opts}]
 *   - system.multicall items use {methodName, params}
 *   - Notifications have no `id`; responses always have `id`
 *   - GIDs are 16-char hex strings
 *   - Error responses: {error: {code, message}} – code 1 = wrong secret
 */
import { Aria2 } from '@/lib/aria2c/service';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

// ─── WebSocket mock ────────────────────────────────────────────────────────

interface MockWs {
  url: string;
  readyState: number;
  send: ReturnType<typeof jest.fn>;
  close: ReturnType<typeof jest.fn>;
  onopen: (() => void) | null;
  onerror: ((e: any) => void) | null;
  onclose: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  receive(data: object): void;
  triggerOpen(): void;
  triggerError(e?: any): void;
  triggerClose(): void;
}

let mockWsInstance: MockWs;

function makeMockWs(url: string): MockWs {
  const ws: MockWs = {
    url,
    readyState: 0,
    send: jest.fn(),
    close: jest.fn().mockImplementation(() => ws.triggerClose()),
    onopen: null,
    onerror: null,
    onclose: null,
    onmessage: null,
    receive(data: object) {
      ws.onmessage?.({ data: JSON.stringify(data) });
    },
    triggerOpen() {
      ws.readyState = 1;
      ws.onopen?.();
    },
    triggerError(e = new Event('error')) {
      ws.onerror?.(e);
    },
    triggerClose() {
      ws.readyState = 3;
      ws.onclose?.();
    },
  };
  return ws;
}

const MockWebSocket = jest.fn().mockImplementation((url: unknown) => {
  mockWsInstance = makeMockWs(url as string);
  return mockWsInstance;
}) as any;
MockWebSocket.OPEN = 1;
MockWebSocket.CONNECTING = 0;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// ─── fetch mock ───────────────────────────────────────────────────────────

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

function makeHttpOk(result: any) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
  } as Response);
}

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.WebSocket = MockWebSocket;
  global.fetch = mockFetch as any;
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Aria2.open — timeout ─────────────────────────────────────────────────

describe('Aria2.open timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects with timeout error when server never responds within 10s', async () => {
    const aria2 = new Aria2();
    const p = aria2.open(); // never triggers onopen
    jest.advanceTimersByTime(10_000);
    await expect(p).rejects.toThrow('timed out');
  });

  test('does not time out when connection opens before 10s', async () => {
    const aria2 = new Aria2();
    const p = aria2.open();
    jest.advanceTimersByTime(5_000);
    mockWsInstance.triggerOpen();
    await expect(p).resolves.toBeUndefined();
  });
});

// ─── Aria2 constructor ────────────────────────────────────────────────────

describe('Aria2 constructor defaults', () => {
  test('builds ws://localhost:6800/jsonrpc when no options given', async () => {
    const aria2 = new Aria2();
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:6800/jsonrpc');
  });

  test('builds wss:// URL when secure=true', async () => {
    const aria2 = new Aria2({
      host: 'rpc.example.com',
      port: 443,
      secure: true,
      path: '/rpc',
    });
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    expect(MockWebSocket).toHaveBeenCalledWith('wss://rpc.example.com:443/rpc');
  });
});

// ─── Aria2.open ───────────────────────────────────────────────────────────

describe('Aria2.open', () => {
  test('resolves when WebSocket fires onopen', async () => {
    const aria2 = new Aria2();
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await expect(p).resolves.toBeUndefined();
  });

  test('rejects when WebSocket fires onerror before open', async () => {
    const aria2 = new Aria2();
    const p = aria2.open();
    const err = new Event('error');
    mockWsInstance.triggerError(err);
    await expect(p).rejects.toBe(err);
  });

  test('creates a new WebSocket when existing socket is CLOSING (readyState=2)', async () => {
    const aria2 = new Aria2();
    const p1 = aria2.open();
    mockWsInstance.triggerOpen();
    await p1;
    // Simulate the socket entering CLOSING state without our close() call
    mockWsInstance.readyState = 2; // WebSocket.CLOSING
    const before = MockWebSocket.mock.calls.length;
    const p2 = aria2.open();
    mockWsInstance.triggerOpen();
    await p2;
    expect(MockWebSocket.mock.calls.length).toBeGreaterThan(before);
  });

  test('does not create a second WebSocket when already connected', async () => {
    const aria2 = new Aria2();
    const p1 = aria2.open();
    mockWsInstance.triggerOpen();
    await p1;
    const before = MockWebSocket.mock.calls.length;
    await aria2.open();
    expect(MockWebSocket.mock.calls.length).toBe(before);
  });
});

// ─── Aria2.close ─────────────────────────────────────────────────────────

describe('Aria2.close', () => {
  test('is a no-op when no WebSocket is open', () => {
    const aria2 = new Aria2();
    expect(() => aria2.close()).not.toThrow();
  });

  test('calls WebSocket.close()', async () => {
    const aria2 = new Aria2();
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    aria2.close();
    expect(mockWsInstance.close).toHaveBeenCalled();
  });
});

// ─── buildMethodName ─────────────────────────────────────────────────────
// Verified via the raw JSON sent over the wire (read from mockWsInstance.send)

describe('buildMethodName', () => {
  async function openAria2(): Promise<Aria2> {
    const aria2 = new Aria2();
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    return aria2;
  }

  function lastSentMethod(): string {
    const raw = (mockWsInstance.send as jest.MockedFunction<any>).mock
      .calls[0][0] as string;
    return JSON.parse(raw).method;
  }

  test('plain method name gets aria2. prefix', async () => {
    const aria2 = await openAria2();
    aria2.call('addUri', ['http://example.com/file.zip'], {});
    expect(lastSentMethod()).toBe('aria2.addUri');
  });

  test('already-prefixed aria2.method is not double-prefixed', async () => {
    const aria2 = await openAria2();
    aria2.call('aria2.addUri', ['http://example.com/file.zip'], {});
    expect(lastSentMethod()).toBe('aria2.addUri');
  });

  test('system.* methods are sent as-is (no aria2. prefix)', async () => {
    const aria2 = await openAria2();
    aria2.call('system.multicall', []);
    expect(lastSentMethod()).toBe('system.multicall');
  });
});

// ─── Token authentication ─────────────────────────────────────────────────

describe('Token authentication (protocol: first param = "token:<secret>")', () => {
  function lastSentParams(): any[] {
    const raw = (mockWsInstance.send as jest.MockedFunction<any>).mock
      .calls[0][0] as string;
    return JSON.parse(raw).params;
  }

  test('prepends "token:<secret>" as the first param when secret is set', async () => {
    const aria2 = new Aria2({ secret: 'my-rpc-token' });
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    // addUri: params should be [token, [uri], options]
    aria2.call('addUri', ['https://example.com/file.zip'], {});
    const params = lastSentParams();
    expect(params[0]).toBe('token:my-rpc-token');
  });

  test('URI list is the second element, wrapped in an array', async () => {
    const aria2 = new Aria2({ secret: 'secret' });
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    aria2.call('addUri', ['https://example.com/file.zip'], {});
    const params = lastSentParams();
    expect(params[1]).toEqual(['https://example.com/file.zip']);
    expect(params[2]).toEqual({});
  });

  test('no token param when secret is empty string', async () => {
    const aria2 = new Aria2({ secret: '' });
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    aria2.call('addUri', ['https://example.com/file.zip'], {});
    const params = lastSentParams();
    expect(params[0]).toEqual(['https://example.com/file.zip']);
  });
});

// ─── Aria2.call via HTTP ──────────────────────────────────────────────────

describe('Aria2.call via HTTP', () => {
  test('uses HTTP when no WebSocket is open', async () => {
    mockFetch.mockImplementationOnce(() => makeHttpOk('aabbccddeeff0011'));
    const aria2 = new Aria2({ host: '127.0.0.1', port: 6800 });
    const result = await aria2.call('addUri', ['http://example.com/f.zip'], {});
    expect(mockFetch).toHaveBeenCalled();
    expect(result).toBe('aabbccddeeff0011');
  });

  test('sends POST to http://host:port/path with JSON content-type', async () => {
    mockFetch.mockImplementationOnce(() => makeHttpOk(null));
    const aria2 = new Aria2({ host: 'myhost', port: 6801, path: '/rpc' });
    await aria2.call('getVersion');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://myhost:6801/rpc');
    expect(opts.method).toBe('POST');
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  test('uses https:// when secure=true', async () => {
    mockFetch.mockImplementationOnce(() => makeHttpOk(null));
    const aria2 = new Aria2({ secure: true });
    await aria2.call('getVersion');
    expect((mockFetch.mock.calls[0] as [string])[0]).toMatch(/^https:/);
  });

  test('prepends token:secret as first param in HTTP request body', async () => {
    mockFetch.mockImplementationOnce(() => makeHttpOk('gid123'));
    const aria2 = new Aria2({ secret: 'rpc-secret' });
    await aria2.call('addUri', ['http://x.com/f.zip'], {});
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.params[0]).toBe('token:rpc-secret');
    expect(body.params[1]).toEqual(['http://x.com/f.zip']);
  });

  test('throws when HTTP response status is not ok', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 503 } as Response),
    );
    const aria2 = new Aria2();
    await expect(aria2.call('getVersion')).rejects.toThrow('503');
  });

  test('throws with message from JSON-RPC error (code 1 = wrong token)', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            error: { code: 1, message: 'Unauthorized' },
          }),
      } as Response),
    );
    const aria2 = new Aria2();
    await expect(aria2.call('getVersion')).rejects.toThrow('Unauthorized');
  });

  test('throws with message from JSON-RPC error (code -32601 = method not found)', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32601, message: 'Method not found' },
          }),
      } as Response),
    );
    const aria2 = new Aria2();
    await expect(aria2.call('unknownMethod')).rejects.toThrow(
      'Method not found',
    );
  });
});

// ─── WebSocket message handling ───────────────────────────────────────────

describe('Aria2 WebSocket message handling', () => {
  async function openAria2(secret = ''): Promise<Aria2> {
    const aria2 = new Aria2({ secret });
    const p = aria2.open();
    mockWsInstance.triggerOpen();
    await p;
    return aria2;
  }

  function lastSentId(): number {
    const raw = (mockWsInstance.send as jest.MockedFunction<any>).mock
      .calls[0][0] as string;
    return JSON.parse(raw).id;
  }

  test('resolves pending callback with result from server response', async () => {
    const aria2 = await openAria2();
    const callPromise = aria2.call('getVersion');
    mockWsInstance.receive({
      jsonrpc: '2.0',
      id: lastSentId(),
      result: { version: '1.36.0', features: [] },
    });
    await expect(callPromise).resolves.toMatchObject({ version: '1.36.0' });
  });

  test('rejects pending callback on JSON-RPC error response', async () => {
    const aria2 = await openAria2();
    const callPromise = aria2.call('getVersion');
    mockWsInstance.receive({
      jsonrpc: '2.0',
      id: lastSentId(),
      error: { code: 1, message: 'Unauthorized' },
    });
    await expect(callPromise).rejects.toThrow('Unauthorized');
  });

  test('returns GID string on successful addUri call', async () => {
    const aria2 = await openAria2('secret');
    const callPromise = aria2.call(
      'addUri',
      ['https://example.com/ubuntu.iso'],
      {},
    );
    mockWsInstance.receive({
      jsonrpc: '2.0',
      id: lastSentId(),
      result: 'aabbccddeeff0011', // 16-char hex GID
    });
    await expect(callPromise).resolves.toBe('aabbccddeeff0011');
  });

  test('stale response with unknown id does not throw', async () => {
    await openAria2();
    expect(() =>
      mockWsInstance.receive({ jsonrpc: '2.0', id: 99999, result: 'stale' }),
    ).not.toThrow();
  });

  test('pending call rejects when connection drops before response arrives', async () => {
    const aria2 = await openAria2();
    const callPromise = aria2.call('getVersion');
    mockWsInstance.triggerClose(); // drop connection with no response
    await expect(callPromise).rejects.toThrow('WebSocket closed');
  });

  test('all pending calls are rejected and the map is cleared on unexpected close', async () => {
    const aria2 = await openAria2();
    const p1 = aria2.call('getVersion');
    const p2 = aria2.call('tellActive');
    mockWsInstance.triggerClose();
    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
  });

  test('invalid JSON is handled gracefully without throwing', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    await openAria2();
    expect(() =>
      mockWsInstance.onmessage?.({ data: 'not valid json {{{{' }),
    ).not.toThrow();
    consoleSpy.mockRestore();
  });
});

// ─── Aria2.multiCall ──────────────────────────────────────────────────────
// The protocol uses system.multicall with {methodName, params} objects.

describe('Aria2.multiCall', () => {
  test('sends system.multicall with {methodName, params} items', async () => {
    mockFetch.mockImplementationOnce(() =>
      makeHttpOk([['aabbccddeeff0011'], ['1122334455667788']]),
    );
    const aria2 = new Aria2({ secret: 'secret' });
    await aria2.multiCall([
      ['addUri', 'http://a.com/1.zip'],
      ['addUri', 'http://b.com/2.zip'],
    ]);
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.method).toBe('system.multicall');
    // With a secret, params[0] is the outer token; params[1] is the items array.
    // Each item must have methodName + params.
    const items = body.params[1];
    expect(items[0].methodName).toBe('aria2.addUri');
    expect(items[1].methodName).toBe('aria2.addUri');
    // Token is prepended inside each item's own params too
    expect(items[0].params[0]).toBe('token:secret');
  });

  test('returns unwrapped first element from each result sub-array', async () => {
    mockFetch.mockImplementationOnce(() =>
      makeHttpOk([['aabbccddeeff0011'], ['1122334455667788']]),
    );
    const aria2 = new Aria2();
    const results = await aria2.multiCall([['addUri'], ['addUri']]);
    expect(results).toEqual(['aabbccddeeff0011', '1122334455667788']);
  });

  test('throws when a result sub-array is empty (invalid multicall response)', async () => {
    mockFetch.mockImplementationOnce(() => makeHttpOk([[]]));
    const aria2 = new Aria2();
    await expect(aria2.multiCall([['addUri']])).rejects.toThrow(
      'Call 0 failed',
    );
  });

  test('throws when a result item contains faultString (XML-RPC fault format)', async () => {
    mockFetch.mockImplementationOnce(() =>
      makeHttpOk([[{ faultString: 'Aria2 internal error' }]]),
    );
    const aria2 = new Aria2();
    await expect(aria2.multiCall([['badMethod']])).rejects.toThrow(
      'Aria2 internal error',
    );
  });
});
