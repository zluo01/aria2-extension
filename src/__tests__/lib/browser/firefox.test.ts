/**
 * Tests for FirefoxClient browser-specific logic.
 * Focus: getDownloadDetail filename extraction and getContentLength HEAD request.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FirefoxClient } from '@/lib/browser/firefox';

// ─── Mocks ────────────────────────────────────────────────────────────────

jest.mock('@/lib/session-cache', () => ({
	cacheRemove: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
}));

jest.mock('webextension-polyfill', () => ({
	storage: {
		local: { get: jest.fn(), set: jest.fn() },
		session: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
	},
	runtime: {
		sendMessage: jest.fn(),
		getPlatformInfo: jest.fn(),
		openOptionsPage: jest.fn(),
		getURL: jest.fn((p: unknown) => `moz-extension://test/${p}`),
	},
	tabs: { query: jest.fn(), remove: jest.fn(), create: jest.fn() },
	windows: {
		getCurrent: jest.fn(),
		remove: jest.fn(),
		create: jest.fn(),
	},
	notifications: { create: jest.fn() },
	action: {
		setBadgeText: jest.fn(),
		setBadgeBackgroundColor: jest.fn(),
	},
	downloads: {
		cancel: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		removeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		erase: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		onCreated: { addListener: jest.fn() },
	},
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
	global.fetch = mockFetch as any;
	jest.clearAllMocks();
});

// ─── helpers ──────────────────────────────────────────────────────────────

function makeItem(
	overrides: Partial<{
		id: number;
		url: string;
		filename: string;
		incognito: boolean;
	}> = {},
) {
	return {
		id: 1,
		url: 'https://example.com/file.zip',
		filename: '/home/user/downloads/file.zip',
		incognito: false,
		...overrides,
	} as any;
}

function makeHeadResponse(contentLength: string | null) {
	const headers = new Headers();
	if (contentLength !== null) {
		headers.set('content-length', contentLength);
	}
	return Promise.resolve({ ok: true, headers } as Response);
}

// ─── getDownloadDetail — filename extraction ───────────────────────────────

describe('FirefoxClient.getDownloadDetail — filename extraction', () => {
	test('extracts filename from a unix-style absolute path', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse('1024'));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: '/home/user/downloads/ubuntu.iso' }),
		);
		expect(detail.filename).toBe('ubuntu.iso');
	});

	test('extracts filename from a Windows-style path with backslashes', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse('2048'));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: 'C:\\Users\\mike\\Downloads\\setup.exe' }),
		);
		expect(detail.filename).toBe('setup.exe');
	});

	test('extracts filename from a path with only forward slashes', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: '/tmp/archive.tar.gz' }),
		);
		expect(detail.filename).toBe('archive.tar.gz');
	});

	test('uses UNKNOWN when filename is empty string', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: '' }),
		);
		expect(detail.filename).toBe('UNKNOWN');
	});

	test('uses UNKNOWN when path ends with a separator (no trailing filename)', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: '/downloads/' }),
		);
		expect(detail.filename).toBe('UNKNOWN');
	});

	test('preserves filename with multiple extensions', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse('512'));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ filename: '/tmp/backup.tar.gz' }),
		);
		expect(detail.filename).toBe('backup.tar.gz');
	});

	test('passes through incognito flag from download item', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ incognito: true }),
		);
		expect(detail.incognito).toBe(true);
	});

	test('uses item.url as the detail url', async () => {
		const client = new FirefoxClient();
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const detail = await (client as any).getDownloadDetail(
			makeItem({ url: 'https://cdn.example.com/release.zip' }),
		);
		expect(detail.url).toBe('https://cdn.example.com/release.zip');
	});
});

// ─── getContentLength — HEAD request ──────────────────────────────────────

describe('FirefoxClient.getContentLength', () => {
	test('returns parsed integer from content-length header', async () => {
		mockFetch.mockImplementationOnce(() => makeHeadResponse('6655619072'));
		const client = new FirefoxClient();
		const len = await (client as any).getContentLength(
			'https://example.com/big.iso',
		);
		expect(len).toBe(6655619072);
	});

	test('returns -1 when content-length header is absent', async () => {
		mockFetch.mockImplementationOnce(() => makeHeadResponse(null));
		const client = new FirefoxClient();
		const len = await (client as any).getContentLength('https://example.com/f');
		expect(len).toBe(-1);
	});

	test('returns -1 when fetch throws (network error)', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Network Error')),
		);
		const client = new FirefoxClient();
		const len = await (client as any).getContentLength('https://example.com/f');
		expect(len).toBe(-1);
	});

	test('sends a HEAD request with credentials: include', async () => {
		mockFetch.mockImplementationOnce(() => makeHeadResponse('100'));
		const client = new FirefoxClient();
		await (client as any).getContentLength('https://example.com/f');
		expect(mockFetch).toHaveBeenCalledWith('https://example.com/f', {
			method: 'HEAD',
			credentials: 'include',
		});
	});

	test('returns -1 for non-numeric content-length header', async () => {
		mockFetch.mockImplementationOnce(() => makeHeadResponse('not-a-number'));
		const client = new FirefoxClient();
		const len = await (client as any).getContentLength('https://example.com/f');
		expect(len).toBe(-1);
	});

	test('returns -1 for content-length of zero', async () => {
		// Firefox reports -1 for unknown size; content-length=0 is valid (empty file)
		mockFetch.mockImplementationOnce(() => makeHeadResponse('0'));
		const client = new FirefoxClient();
		const len = await (client as any).getContentLength('https://example.com/f');
		expect(len).toBe(0);
	});
});
