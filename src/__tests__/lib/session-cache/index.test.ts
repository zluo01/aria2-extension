import { beforeEach, describe, expect, test, vi } from 'vitest';
import browser from 'webextension-polyfill';

import { cacheRemove, cacheSet } from '@/lib/session-cache';

vi.mock('webextension-polyfill', () => {
	const mock = {
		storage: { session: { set: vi.fn(), get: vi.fn(), remove: vi.fn() } },
	};
	return { default: mock, ...mock };
});

const PREFIX = 'aria2-signal:';

describe('session-cache', () => {
	let store: Record<string, unknown>;

	beforeEach(() => {
		store = {};
		vi.clearAllMocks();

		vi.mocked(browser.storage.session.set).mockImplementation(
			async (obj: Record<string, unknown>) => {
				Object.assign(store, obj);
			},
		);

		vi.mocked(browser.storage.session.get).mockImplementation(async (keys) => {
			const key = keys as string;
			return key in store ? { [key]: store[key] } : {};
		});

		vi.mocked(browser.storage.session.remove).mockImplementation(
			async (keys) => {
				delete store[keys as string];
			},
		);
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
