/**
 * Tests for Aria2Client — the high-level wrapper over the Aria2 service.
 *
 * Protocol reference: https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface
 *
 * Aria2Client responsibilities tested here:
 *   - WS: open → call → close lifecycle for every operation
 *   - HTTP: direct call without open/close
 *   - addUri wraps URI in an array: call('addUri', [link], options)
 *   - addUris maps each URI to ['addUri', [uri]]
 *   - getJobs: tellActive + tellWaiting(0, 25) via multiCall
 *   - getNumJobs: tellActive count
 *   - startJobs/pauseJobs/removeJobs: guard against empty gid list
 *   - Error paths return safe defaults and/or notify the user
 */
import { Aria2Client } from '@/lib/aria2c/client';
import { client as browserClient } from '@/lib/browser';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────

jest.mock('@/lib/browser', () => ({
  client: {
    notify: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

jest.mock('webextension-polyfill', () => ({}));

const mockOpen = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockClose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockCall = jest.fn<(...args: any[]) => Promise<any>>();
const mockMultiCall = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('@/lib/aria2c/service', () => ({
  Aria2: jest.fn().mockImplementation(() => ({
    open: mockOpen,
    close: mockClose,
    call: mockCall,
    multiCall: mockMultiCall,
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

// ─── helpers ──────────────────────────────────────────────────────────────

function makeWsClient() {
  return new Aria2Client({
    host: '127.0.0.1',
    port: 6800,
    protocol: 'ws',
    token: '',
    path: '/jsonrpc',
  });
}

function makeHttpClient() {
  return new Aria2Client({
    host: '127.0.0.1',
    port: 6800,
    protocol: 'http',
    token: '',
    path: '/jsonrpc',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── getJobs ─────────────────────────────────────────────────────────────

describe('Aria2Client.getJobs', () => {
  test('calls tellActive and tellWaiting(offset=0, num=25) via multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([[activeJob], [waitingJob]]);
    const client = makeWsClient();
    await client.getJobs();
    expect(mockMultiCall).toHaveBeenCalledWith([
      ['tellActive'],
      ['tellWaiting', 0, 25],
    ]);
  });

  test('merges active and waiting jobs into a flat array preserving order', async () => {
    mockMultiCall.mockResolvedValueOnce([[activeJob], [waitingJob]]);
    const client = makeWsClient();
    const jobs = await client.getJobs();
    expect(jobs.map(j => j.gid)).toEqual([GID_A, GID_B]);
  });

  test('returns empty array when both active and waiting are empty', async () => {
    mockMultiCall.mockResolvedValueOnce([[], []]);
    const client = makeWsClient();
    expect(await client.getJobs()).toEqual([]);
  });

  test('opens and closes WS connection around the multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([[], []]);
    const client = makeWsClient();
    await client.getJobs();
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test('does NOT open/close WS for HTTP protocol', async () => {
    mockMultiCall.mockResolvedValueOnce([[], []]);
    const client = makeHttpClient();
    await client.getJobs();
    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  test('returns [] and logs error on network failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockMultiCall.mockRejectedValueOnce(new Error('connection refused'));
    const client = makeWsClient();
    expect(await client.getJobs()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('WS is closed even when multiCall rejects (finally block)', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockMultiCall.mockRejectedValueOnce(new Error('timeout'));
    const client = makeWsClient();
    await client.getJobs();
    expect(mockClose).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── getNumJobs ───────────────────────────────────────────────────────────

describe('Aria2Client.getNumJobs', () => {
  test('returns number of active jobs from tellActive', async () => {
    mockCall.mockResolvedValueOnce([activeJob, waitingJob]); // 2 active
    const client = makeWsClient();
    expect(await client.getNumJobs()).toBe(2);
  });

  test('returns 0 when no active jobs', async () => {
    mockCall.mockResolvedValueOnce([]);
    const client = makeWsClient();
    expect(await client.getNumJobs()).toBe(0);
  });

  test('returns 0 and logs error on failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockCall.mockRejectedValueOnce(new Error('timeout'));
    const client = makeWsClient();
    expect(await client.getNumJobs()).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── startJobs ────────────────────────────────────────────────────────────

describe('Aria2Client.startJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeWsClient().startJobs();
    expect(mockMultiCall).not.toHaveBeenCalled();
  });

  test('calls unpause for each gid via multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([GID_A, GID_B]);
    await makeWsClient().startJobs(GID_A, GID_B);
    expect(mockMultiCall).toHaveBeenCalledWith([
      ['unpause', GID_A],
      ['unpause', GID_B],
    ]);
  });

  test('logs error on failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockMultiCall.mockRejectedValueOnce(new Error('fail'));
    await makeWsClient().startJobs(GID_A);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── pauseJobs ────────────────────────────────────────────────────────────

describe('Aria2Client.pauseJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeWsClient().pauseJobs();
    expect(mockMultiCall).not.toHaveBeenCalled();
  });

  test('calls pause for each gid via multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([GID_C]);
    await makeWsClient().pauseJobs(GID_C);
    expect(mockMultiCall).toHaveBeenCalledWith([['pause', GID_C]]);
  });
});

// ─── removeJobs ───────────────────────────────────────────────────────────

describe('Aria2Client.removeJobs', () => {
  test('does nothing when called with no gids', async () => {
    await makeWsClient().removeJobs();
    expect(mockMultiCall).not.toHaveBeenCalled();
  });

  test('calls remove for each gid via multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([GID_A, GID_B, GID_C]);
    await makeWsClient().removeJobs(GID_A, GID_B, GID_C);
    expect(mockMultiCall).toHaveBeenCalledWith([
      ['remove', GID_A],
      ['remove', GID_B],
      ['remove', GID_C],
    ]);
  });
});

// ─── addUri ───────────────────────────────────────────────────────────────
// Per protocol: call('addUri', [link], options) → params = [[link], options]

describe('Aria2Client.addUri', () => {
  test('calls aria2.call with URI wrapped in an array as per the protocol', async () => {
    mockCall.mockResolvedValueOnce(GID_A);
    await makeWsClient().addUri(
      'https://example.com/ubuntu.iso',
      'ubuntu.iso',
      {
        out: 'ubuntu.iso',
        dir: '/downloads',
      },
    );
    expect(mockCall).toHaveBeenCalledWith(
      'addUri',
      ['https://example.com/ubuntu.iso'],
      { out: 'ubuntu.iso', dir: '/downloads' },
    );
  });

  test('uses empty options {} when none provided', async () => {
    mockCall.mockResolvedValueOnce(GID_A);
    await makeWsClient().addUri('https://example.com/f.zip');
    const args = mockCall.mock.calls[0] as any[];
    expect(args[2]).toEqual({});
  });

  test('notifies user with filename on success', async () => {
    mockCall.mockResolvedValueOnce(GID_A);
    await makeWsClient().addUri('https://example.com/f.zip', 'f.zip');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('f.zip'),
    );
  });

  test('notifies user of failure on RPC error', async () => {
    mockCall.mockRejectedValueOnce(new Error('Unauthorized'));
    await makeWsClient().addUri('https://example.com/f.zip', 'f.zip');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('Fail'),
    );
  });

  test('opens and closes WS connection around the singleCall', async () => {
    mockCall.mockResolvedValueOnce(GID_A);
    await makeWsClient().addUri('https://example.com/f.zip');
    expect(mockOpen).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});

// ─── addUris ──────────────────────────────────────────────────────────────
// Per protocol: each URI maps to ['addUri', [uri]] in the multiCall list

describe('Aria2Client.addUris', () => {
  test('does nothing and sends no notification when called with no URIs', async () => {
    await makeWsClient().addUris();
    expect(mockMultiCall).not.toHaveBeenCalled();
    expect(jest.mocked(browserClient.notify)).not.toHaveBeenCalled();
  });

  test('maps each URI to ["addUri", [uri]] in multiCall', async () => {
    mockMultiCall.mockResolvedValueOnce([GID_A, GID_B]);
    await makeWsClient().addUris(
      'https://a.example.com/1.zip',
      'https://b.example.com/2.zip',
    );
    expect(mockMultiCall).toHaveBeenCalledWith([
      ['addUri', ['https://a.example.com/1.zip']],
      ['addUri', ['https://b.example.com/2.zip']],
    ]);
  });

  test('notifies user with the number of files added', async () => {
    mockMultiCall.mockResolvedValueOnce([GID_A, GID_B, GID_C]);
    await makeWsClient().addUris(
      'https://a.com/1',
      'https://b.com/2',
      'https://c.com/3',
    );
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('3'),
    );
  });

  test('notifies user of failure on RPC error', async () => {
    mockMultiCall.mockRejectedValueOnce(new Error('Unauthorized'));
    await makeWsClient().addUris('https://a.com/f');
    expect(jest.mocked(browserClient.notify)).toHaveBeenCalledWith(
      expect.stringContaining('Fail'),
    );
  });
});
