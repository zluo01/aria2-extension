import { cacheRemove, cacheSet } from '@/lib/session-cache';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import browser from 'webextension-polyfill';

jest.mock('webextension-polyfill', () => ({
  storage: {
    session: {
      set: jest.fn(),
      get: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

const PREFIX = 'aria2-signal:';

describe('session-cache', () => {
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    jest.clearAllMocks();

    jest
      .mocked(browser.storage.session.set)
      .mockImplementation(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      });

    jest
      .mocked(browser.storage.session.get)
      .mockImplementation(async (key: string) =>
        key in store ? { [key]: store[key] } : {},
      );

    jest
      .mocked(browser.storage.session.remove)
      .mockImplementation(async (key: string) => {
        delete store[key];
      });
  });

  describe('set', () => {
    test('writes prefixed key with true to session storage', async () => {
      await cacheSet('https://example.com/file.zip');
      expect(browser.storage.session.set).toHaveBeenCalledWith({
        [`${PREFIX}https://example.com/file.zip`]: true,
      });
    });

    test('keys are stored independently', async () => {
      await cacheSet('url-a');
      await cacheSet('url-b');
      expect(store[`${PREFIX}url-a`]).toBe(true);
      expect(store[`${PREFIX}url-b`]).toBe(true);
    });
  });

  describe('remove', () => {
    test('returns true and deletes the entry when key exists', async () => {
      await cacheSet('https://example.com/file.zip');
      const result = await cacheRemove('https://example.com/file.zip');
      expect(result).toBe(true);
      expect(store[`${PREFIX}https://example.com/file.zip`]).toBeUndefined();
    });

    test('returns false when key does not exist', async () => {
      const result = await cacheRemove('https://example.com/nonexistent.zip');
      expect(result).toBe(false);
    });

    test('can only be consumed once', async () => {
      await cacheSet('https://example.com/file.zip');
      expect(await cacheRemove('https://example.com/file.zip')).toBe(true);
      expect(await cacheRemove('https://example.com/file.zip')).toBe(false);
    });

    test('does not affect other keys', async () => {
      await cacheSet('url-a');
      await cacheSet('url-b');
      await cacheRemove('url-a');
      expect(store[`${PREFIX}url-b`]).toBe(true);
    });
  });
});
