/**
 * Tests for Aria2Client — the high-level wrapper over the Aria2 JSON-RPC API.
 *
 * Protocol reference: https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface
 *
 * Coverage:
 *   - shouldReset: returns true on any connection-param change, false for identical config
 *   - getJobs: issues system.multicall with tellActive + tellWaiting(0,25); merges results
 *   - getNumJobs: counts results from tellActive
 *   - startJobs / pauseJobs / removeJobs: guard empty args; map to correct RPC methods
 *   - addUri: wraps URI in array per protocol; passes options; notifies on success/failure
 *   - addUris: maps each URI to [uri]; notifies count; guards empty args
 *   - Token: prepended to every request's params when set
 *   - multiCall error handling: faultString and empty-result propagate as thrown errors
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

import { Aria2Client } from '@/lib/aria2c/client';
import { client as browserClient } from '@/lib/browser';

// ─── Mocks ────────────────────────────────────────────────────────────────

jest.mock('@/lib/browser', () => ({
  client: {
    notify: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

jest.mock('webextension-polyfill', () => ({}));

const mockRequest = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('@/lib/aria2c/connector', () => ({
  createConnector: jest.fn().mockImplementation(() => ({
    request: mockRequest,
  })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────

// aria2 GIDs are 16-char hex strings
const GID_A = 'aabbccddeeff0011';
const GID_B = '1122334455667788';
const GID_C = 'ffeeddccbbaa9988';

const activeJob = {
  gid: GID_A,
  status: 'active',
  totalLength: '1048576',
  completedLength: '524288',
  downloadSpeed: '512000',
  files: [{ path: '/tmp/file.zip' }],
};

const waitingJob = {
  gid: GID_B,
  status: 'waiting',
  totalLength: '2097152',
  completedLength: '0',
  downloadSpeed: '0',
  files: [{ path: '/tmp/other.zip' }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const BASE_CONFIG = {
  host: '127.0.0.1',
  port: 6800,
  protocol: 'ws',
  token: '',
  path: '/jsonrpc',
};

function makeClient(overrides: Partial<typeof BASE_CONFIG> = {}) {
  return new Aria2Client({ ...BASE_CONFIG, ...overrides });
}

/**
 * aria2's system.multicall wire format: each sub-call result is wrapped in a
 * single-element array [value], or an object {faultCode, faultString} on error.
 * This helper wraps each value so tests read naturally.
 *
 * Example: multicallResult([job1, job2], [job3]) → [[[job1, job2]], [[job3]]]
 */
function multicallResult(...values: any[]) {
  return values.map(v => [v]);
}

beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  jest.clearAllMocks();
});

// ─── shouldReset ──────────────────────────────────────────────────────────

describe('Aria2Client.shouldReset', () => {
  test('returns false for identical config — no reconnect needed', () => {
    expect(makeClient().shouldReset(BASE_CONFIG)).toBe(false);
  });

  test('returns true when host changes', () => {
    expect(
      makeClient().shouldReset({ ...BASE_CONFIG, host: '192.168.1.1' }),
    ).toBe(true);
  });

  test('returns true when port changes', () => {
    expect(makeClient().shouldReset({ ...BASE_CONFIG, port: 6801 })).toBe(true);
  });

  test('returns true when token changes', () => {
    expect(makeClient().shouldReset({ ...BASE_CONFIG, token: 'secret' })).toBe(
      true,
    );
  });

  test('returns true when protocol changes (ws → http)', () => {
    expect(makeClient().shouldReset({ ...BASE_CONFIG, protocol: 'http' })).toBe(
      true,
    );
  });

  test('returns true when protocol changes (ws → wss, adds TLS)', () => {
    expect(makeClient().shouldReset({ ...BASE_CONFIG, protocol: 'wss' })).toBe(
      true,
    );
  });

  test('returns true when RPC path changes', () => {
    expect(makeClient().shouldReset({ ...BASE_CONFIG, path: '/rpc' })).toBe(
      true,
    );
  });

  test('wss and https are both secure but different transports — triggers reset', () => {
    expect(
      makeClient({ protocol: 'wss' }).shouldReset({
        ...BASE_CONFIG,
        protocol: 'https',
      }),
    ).toBe(true);
  });
});

// ─── getJobs ─────────────────────────────────────────────────────────────

describe('Aria2Client.getJobs', () => {
  test('sends system.multicall with tellActive and tellWaiting(offset=0, num=25)', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult([], []));
    await makeClient().getJobs();
    expect(mockRequest).toHaveBeenCalledWith('system.multicall', [
      [
        { methodName: 'aria2.tellActive', params: [] },
        { methodName: 'aria2.tellWaiting', params: [0, 25] },
      ],
    ]);
  });

  test('merges active and waiting results in order (active first)', async () => {
    mockRequest.mockResolvedValueOnce(
      multicallResult([activeJob], [waitingJob]),
    );
    const jobs = await makeClient().getJobs();
    expect(jobs.map(j => j.gid)).toEqual([GID_A, GID_B]);
  });

  test('returns empty array when both active and waiting lists are empty', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult([], []));
    expect(await makeClient().getJobs()).toEqual([]);
  });

  test('returns [] and logs error on network failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockRequest.mockRejectedValueOnce(new Error('connection refused'));
    expect(await makeClient().getJobs()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('propagates faultString from a failing sub-call as a thrown error', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockRequest.mockResolvedValueOnce([
      [[activeJob]],
      [{ faultCode: 1, faultString: 'aria2 error: invalid params' }],
    ]);
    expect(await makeClient().getJobs()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Fail to get jobs',
      expect.objectContaining({ message: 'aria2 error: invalid params' }),
    );
    consoleSpy.mockRestore();
  });

  test('treats an empty sub-call result as an error', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockRequest.mockResolvedValueOnce([[[activeJob]], []]);
    expect(await makeClient().getJobs()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Fail to get jobs',
      expect.objectContaining({ message: expect.stringContaining('failed') }),
    );
    consoleSpy.mockRestore();
  });
});

// ─── getNumJobs ───────────────────────────────────────────────────────────

describe('Aria2Client.getNumJobs', () => {
  test('sends tellActive and returns the count of active jobs', async () => {
    mockRequest.mockResolvedValueOnce([activeJob, waitingJob]);
    expect(await makeClient().getNumJobs()).toBe(2);
    expect(mockRequest).toHaveBeenCalledWith('aria2.tellActive', []);
  });

  test('returns 0 when no active jobs', async () => {
    mockRequest.mockResolvedValueOnce([]);
    expect(await makeClient().getNumJobs()).toBe(0);
  });

  test('returns 0 and logs error on failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockRequest.mockRejectedValueOnce(new Error('timeout'));
    expect(await makeClient().getNumJobs()).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── startJobs ────────────────────────────────────────────────────────────

describe('Aria2Client.startJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeClient().startJobs();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('sends unpause for each gid via system.multicall', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult(GID_A, GID_B));
    await makeClient().startJobs(GID_A, GID_B);
    expect(mockRequest).toHaveBeenCalledWith('system.multicall', [
      [
        { methodName: 'aria2.unpause', params: [GID_A] },
        { methodName: 'aria2.unpause', params: [GID_B] },
      ],
    ]);
  });

  test('logs error on failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockRequest.mockRejectedValueOnce(new Error('fail'));
    await makeClient().startJobs(GID_A);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── pauseJobs ────────────────────────────────────────────────────────────

describe('Aria2Client.pauseJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeClient().pauseJobs();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('sends pause for each gid via system.multicall', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult(GID_C));
    await makeClient().pauseJobs(GID_C);
    expect(mockRequest).toHaveBeenCalledWith('system.multicall', [
      [{ methodName: 'aria2.pause', params: [GID_C] }],
    ]);
  });
});

// ─── removeJobs ───────────────────────────────────────────────────────────

describe('Aria2Client.removeJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeClient().removeJobs();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('sends remove for each gid via system.multicall', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult(GID_A, GID_B, GID_C));
    await makeClient().removeJobs(GID_A, GID_B, GID_C);
    expect(mockRequest).toHaveBeenCalledWith('system.multicall', [
      [
        { methodName: 'aria2.remove', params: [GID_A] },
        { methodName: 'aria2.remove', params: [GID_B] },
        { methodName: 'aria2.remove', params: [GID_C] },
      ],
    ]);
  });
});

// ─── addUri ───────────────────────────────────────────────────────────────
// Protocol requirement: URI must be wrapped in an array: addUri([[uri], options])

describe('Aria2Client.addUri', () => {
  test('calls aria2.addUri with URI wrapped in array and options object', async () => {
    mockRequest.mockResolvedValueOnce(GID_A);
    await makeClient().addUri('https://example.com/ubuntu.iso', 'ubuntu.iso', {
      out: 'ubuntu.iso',
      dir: '/downloads',
    });
    expect(mockRequest).toHaveBeenCalledWith('aria2.addUri', [
      ['https://example.com/ubuntu.iso'],
      { out: 'ubuntu.iso', dir: '/downloads' },
    ]);
  });

  test('passes empty options {} when none provided', async () => {
    mockRequest.mockResolvedValueOnce(GID_A);
    await makeClient().addUri('https://example.com/f.zip');
    const [, params] = mockRequest.mock.calls[0] as [string, any[]];
    expect(params[1]).toEqual({});
  });

  test('notifies user with filename on success', async () => {
    mockRequest.mockResolvedValueOnce(GID_A);
    await makeClient().addUri('https://example.com/f.zip', 'f.zip');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('f.zip'),
    );
  });

  test('notifies user of failure on RPC error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Unauthorized'));
    await makeClient().addUri('https://example.com/f.zip', 'f.zip');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('Fail'),
    );
  });
});

// ─── addUris ──────────────────────────────────────────────────────────────
// Each URI maps to {methodName: 'aria2.addUri', params: [[uri]]} in the multicall

describe('Aria2Client.addUris', () => {
  test('does nothing and sends no notification when called with no URIs', async () => {
    await makeClient().addUris();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(jest.mocked(browserClient.notify)).not.toHaveBeenCalled();
  });

  test('maps each URI to {methodName: aria2.addUri, params: [[uri]]} in multicall', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult(GID_A, GID_B));
    await makeClient().addUris(
      'https://a.example.com/1.zip',
      'https://b.example.com/2.zip',
    );
    expect(mockRequest).toHaveBeenCalledWith('system.multicall', [
      [
        {
          methodName: 'aria2.addUri',
          params: [['https://a.example.com/1.zip']],
        },
        {
          methodName: 'aria2.addUri',
          params: [['https://b.example.com/2.zip']],
        },
      ],
    ]);
  });

  test('notifies user with the number of files added', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult(GID_A, GID_B, GID_C));
    await makeClient().addUris(
      'https://a.com/1',
      'https://b.com/2',
      'https://c.com/3',
    );
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('3'),
    );
  });

  test('notifies user of failure on RPC error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Unauthorized'));
    await makeClient().addUris('https://a.com/f');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('Fail'),
    );
  });
});

// ─── Token handling ───────────────────────────────────────────────────────

describe('Aria2Client token handling', () => {
  test('prepends token:SECRET to params for direct RPC calls', async () => {
    mockRequest.mockResolvedValueOnce([]);
    await makeClient({ token: 'SECRET' }).getNumJobs();
    expect(mockRequest).toHaveBeenCalledWith('aria2.tellActive', [
      'token:SECRET',
    ]);
  });

  test('prepends token:SECRET to each sub-call params inside system.multicall', async () => {
    mockRequest.mockResolvedValueOnce(multicallResult([], []));
    await makeClient({ token: 'SECRET' }).getJobs();
    // Call shape: request('system.multicall', ['token:SECRET', [...subCalls]])
    const [, outerParams] = mockRequest.mock.calls[0] as [string, any[]];
    const subCalls = outerParams[1] as any[]; // index 1 because token is at index 0
    expect(subCalls[0]).toMatchObject({
      methodName: 'aria2.tellActive',
      params: ['token:SECRET'],
    });
    expect(subCalls[1]).toMatchObject({
      methodName: 'aria2.tellWaiting',
      params: ['token:SECRET', 0, 25],
    });
  });
});
