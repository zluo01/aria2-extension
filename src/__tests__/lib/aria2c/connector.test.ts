import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { createConnector } from '@/lib/aria2c/connector';

// ─── WebSocket mock ──────────────────────────────────────────────────────────

let wsInstance: {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((e: any) => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  send: jest.Mock;
  close: jest.Mock;
  readyState: number;
};

const OPEN = 1;

beforeEach(() => {
  wsInstance = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    send: jest.fn(),
    close: jest.fn(),
    readyState: OPEN,
  };

  (globalThis as any).WebSocket = jest.fn(() => wsInstance);
  (globalThis as any).WebSocket.OPEN = OPEN;
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeWsConnector() {
  const connector = createConnector('ws', '127.0.0.1', 6800, false);
  // Simulate connection open
  wsInstance.onopen?.();
  return connector;
}

function respondToLastRequest(result: any) {
  const call = wsInstance.send.mock.calls.at(-1)![0] as string;
  const { id } = JSON.parse(call);
  wsInstance.onmessage?.({
    data: JSON.stringify({ jsonrpc: '2.0', id, result }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WebSocket connector timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test('request resolves before timeout', async () => {
    const connector = makeWsConnector();

    const promise = connector.request('aria2.getVersion', []);
    respondToLastRequest({ version: '1.36.0' });

    await expect(promise).resolves.toEqual({ version: '1.36.0' });
  });

  test('request rejects after 3s timeout', async () => {
    const connector = makeWsConnector();

    const promise = connector.request('aria2.getVersion', []);
    jest.advanceTimersByTime(3_000);

    await expect(promise).rejects.toThrow(
      'Request timed out: aria2.getVersion',
    );
  });

  test('timeout clears callback from map (no leak)', async () => {
    const connector = makeWsConnector();

    const promise = connector.request('aria2.getVersion', []);
    jest.advanceTimersByTime(3_000);
    await promise.catch(() => undefined);

    // A second request should still work (map wasn't corrupted)
    const p2 = connector.request('aria2.tellActive', []);
    respondToLastRequest([]);
    await expect(p2).resolves.toEqual([]);
  });

  test('response after timeout is ignored (no double-settle)', async () => {
    const connector = makeWsConnector();

    const promise = connector.request('aria2.getVersion', []);
    jest.advanceTimersByTime(3_000);
    await expect(promise).rejects.toThrow('Request timed out');

    // Late response arrives — should not throw
    respondToLastRequest({ version: '1.36.0' });
  });
});

describe('HTTP connector timeout', () => {
  test('passes AbortSignal.timeout to fetch', async () => {
    const mockSignal = {} as AbortSignal;
    const timeoutSpy = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(mockSignal);

    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 'test',
          result: { version: '1.36.0' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = mockFetch;

    const connector = createConnector('http', '127.0.0.1', 6800, false);
    await connector.request('aria2.getVersion', []);

    expect(timeoutSpy).toHaveBeenCalledWith(3_000);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: mockSignal }),
    );

    timeoutSpy.mockRestore();
  });
});
