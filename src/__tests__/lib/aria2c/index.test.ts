/**
 * Tests for aria2Client() — the singleton factory.
 *
 * Concurrent-safety properties verified:
 *   - Concurrent calls before the factory resolves share one Aria2Client (no double-init)
 *   - Subsequent calls return the cached instance without re-running the factory
 *   - shouldReset returning true creates a new instance and stores it as the new singleton
 *   - After a reset, the next call uses the new instance (not the old one)
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import type { IConfig } from '@/types';

const BASE_CONFIG: IConfig = {
  host: '127.0.0.1',
  port: 6800,
  protocol: 'ws',
  token: '',
  path: '/jsonrpc',
};

const NEW_CONFIG = { ...BASE_CONFIG, host: '192.168.1.1' };

// ─── Module loader ────────────────────────────────────────────────────────
// Each test gets a fresh module (singletonPromise reset to null) via
// jest.resetModules() + jest.doMock() + dynamic import.

async function loadModule(opts: {
  getConfiguration: jest.Mock<() => Promise<IConfig>>;
  shouldReset?: jest.Mock<() => boolean>;
  isAlive?: jest.Mock<() => boolean>;
}) {
  const shouldResetFn = opts.shouldReset ?? jest.fn().mockReturnValue(false);
  const isAliveFn = opts.isAlive ?? jest.fn().mockReturnValue(true);
  const MockAria2Client = jest.fn().mockImplementation(() => ({
    shouldReset: shouldResetFn,
    close: jest.fn(),
    isAlive: isAliveFn,
  }));

  jest.doMock('webextension-polyfill', () => ({}));
  jest.doMock('@/lib/browser', () => ({
    client: { getConfiguration: opts.getConfiguration },
  }));
  jest.doMock('@/lib/aria2c/client', () => ({ Aria2Client: MockAria2Client }));

  const { aria2Client } = await import('@/lib/aria2c');
  return { aria2Client, MockAria2Client, shouldResetFn };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('aria2Client singleton', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('concurrent calls before factory resolves share one Aria2Client', async () => {
    // Deferred config so we can fire both calls before the factory settles.
    let resolveConfig!: (v: typeof BASE_CONFIG) => void;
    const deferred = new Promise<typeof BASE_CONFIG>(resolve => {
      resolveConfig = resolve;
    });

    const getConfiguration = jest
      .fn<() => Promise<IConfig>>()
      .mockReturnValueOnce(deferred) // factory call — held pending
      .mockResolvedValue(BASE_CONFIG); // shouldReset checks — immediate

    const { aria2Client, MockAria2Client } = await loadModule({
      getConfiguration,
    });

    // Both calls start before the factory resolves.
    const p1 = aria2Client();
    const p2 = aria2Client();

    // Let the factory's getConfiguration resolve now.
    resolveConfig(BASE_CONFIG);

    const [c1, c2] = await Promise.all([p1, p2]);

    expect(MockAria2Client).toHaveBeenCalledTimes(1); // factory ran exactly once
    expect(c1).toBe(c2); // same instance returned to both callers
  });

  test('subsequent calls return the cached instance without re-creating', async () => {
    const getConfiguration = jest
      .fn<() => Promise<IConfig>>()
      .mockResolvedValue(BASE_CONFIG);
    const { aria2Client, MockAria2Client } = await loadModule({
      getConfiguration,
    });

    const c1 = await aria2Client();
    const c2 = await aria2Client();
    const c3 = await aria2Client();

    expect(MockAria2Client).toHaveBeenCalledTimes(1);
    expect(c1).toBe(c2);
    expect(c2).toBe(c3);
  });

  test('creates a new instance when shouldReset returns true', async () => {
    // shouldReset: first call stable, second call config changed.
    const shouldReset = jest
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const getConfiguration = jest
      .fn<() => Promise<IConfig>>()
      .mockResolvedValueOnce(BASE_CONFIG) // factory
      .mockResolvedValueOnce(BASE_CONFIG) // first shouldReset check → stable
      .mockResolvedValue(NEW_CONFIG); // second shouldReset check → changed

    const { aria2Client, MockAria2Client } = await loadModule({
      getConfiguration,
      shouldReset,
    });

    const c1 = await aria2Client();
    const c2 = await aria2Client();

    expect(MockAria2Client).toHaveBeenCalledTimes(2); // new instance created
    expect(c1).not.toBe(c2);
  });

  test('after reset the new instance becomes the singleton for future calls', async () => {
    // Call 1 triggers reset; calls 2 and 3 should all get the new instance.
    const shouldReset = jest
      .fn<() => boolean>()
      .mockReturnValueOnce(true) // call 1: old instance is stale
      .mockReturnValue(false); // call 2+: new instance is stable

    const getConfiguration = jest
      .fn<() => Promise<IConfig>>()
      .mockResolvedValueOnce(BASE_CONFIG) // factory
      .mockResolvedValue(NEW_CONFIG); // all shouldReset checks use new config

    const { aria2Client, MockAria2Client } = await loadModule({
      getConfiguration,
      shouldReset,
    });

    const c1 = await aria2Client(); // resets → returns new instance
    const c2 = await aria2Client(); // should use new singleton
    const c3 = await aria2Client();

    expect(MockAria2Client).toHaveBeenCalledTimes(2); // only one reset happened
    expect(c1).toBe(c2); // new instance reused
    expect(c2).toBe(c3);
  });

  test('creates a new instance when isAlive returns false (dead connection)', async () => {
    const isAlive = jest
      .fn<() => boolean>()
      .mockReturnValueOnce(true) // first call: connection alive
      .mockReturnValueOnce(false); // second call: connection dead

    const getConfiguration = jest
      .fn<() => Promise<IConfig>>()
      .mockResolvedValue(BASE_CONFIG);

    const { aria2Client, MockAria2Client } = await loadModule({
      getConfiguration,
      isAlive,
    });

    const c1 = await aria2Client();
    const c2 = await aria2Client();

    expect(MockAria2Client).toHaveBeenCalledTimes(2);
    expect(c1).not.toBe(c2);
  });
});
