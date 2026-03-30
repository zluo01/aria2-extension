/**
 * Tests for IBaseBrowserClient shared logic.
 * Uses a minimal concrete subclass to exercise protected methods.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { IBaseBrowserClient } from '@/lib/browser/base';
import { type IFileDetail, MessageType } from '@/types';

jest.mock('webextension-polyfill', () => ({
	storage: {
		local: {
			get: jest.fn(),
			set: jest.fn(),
		},
		session: {
			get: jest.fn(),
			set: jest.fn(),
			remove: jest.fn(),
		},
	},
	runtime: {
		sendMessage: jest.fn(),
		getPlatformInfo: jest.fn(),
		openOptionsPage: jest.fn(),
		getURL: jest.fn((p: unknown) => `moz-extension://test/${p}`),
	},
	tabs: { query: jest.fn(), remove: jest.fn(), create: jest.fn() },
	windows: { getCurrent: jest.fn(), remove: jest.fn() },
	notifications: { create: jest.fn() },
	action: {
		setBadgeText: jest.fn(),
		setBadgeBackgroundColor: jest.fn(),
	},
	downloads: {
		cancel: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		removeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		erase: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
	},
}));

// ─── Test subclass ────────────────────────────────────────────────────────

class TestBrowserClient extends IBaseBrowserClient<unknown> {
	protected async getDownloadDetail(_item: unknown): Promise<IFileDetail> {
		return { url: '', filename: '', fileSize: 0, incognito: false };
	}

	protected async createDownloadPanel(_detail: IFileDetail): Promise<void> {
		return Promise.resolve();
	}

	protected async initializeBrowserDownload(
		_filename: string,
		_saveAs: boolean,
		_url: string,
		_incognito: boolean,
	): Promise<void> {
		return Promise.resolve();
	}

	registerDownloadInterceptor(): void {
		// no-op stub for testing
	}

	// Expose protected for testing
	public testShouldIgnore(url: string) {
		return this.shouldIgnoreDownloadURL(url);
	}
}

// ─── shouldIgnoreDownloadURL ──────────────────────────────────────────────

describe('shouldIgnoreDownloadURL', () => {
	let client: TestBrowserClient;

	beforeEach(() => {
		client = new TestBrowserClient();
	});

	const skippedSchemes = [
		{ scheme: 'blob:', url: 'blob:https://example.com/abc-123' },
		{ scheme: 'data:', url: 'data:text/plain;base64,SGVsbG8=' },
		{ scheme: 'file:', url: 'file:///home/user/file.txt' },
		{
			scheme: 'filesystem:',
			url: 'filesystem:https://example.com/tmp/img.png',
		},
		{ scheme: 'content:', url: 'content://com.example/file' },
		{ scheme: 'about:', url: 'about:blank' },
		{ scheme: 'chrome-extension:', url: 'chrome-extension://abcd/page.html' },
		{ scheme: 'moz-extension:', url: 'moz-extension://abcd/page.html' },
		{ scheme: 'edge-extension:', url: 'edge-extension://abcd/page.html' },
		{ scheme: 'intent:', url: 'intent://scan/#Intent;scheme=zxing;end' },
	];

	skippedSchemes.forEach(({ scheme, url }) => {
		test(`returns true for ${scheme} URLs`, () => {
			expect(client.testShouldIgnore(url)).toBe(true);
		});
	});

	test('returns false for http: URLs', () => {
		expect(client.testShouldIgnore('http://example.com/file.zip')).toBe(false);
	});

	test('returns false for https: URLs', () => {
		expect(client.testShouldIgnore('https://example.com/file.zip')).toBe(false);
	});

	test('returns false for ftp: URLs', () => {
		expect(client.testShouldIgnore('ftp://example.com/file.zip')).toBe(false);
	});

	test('returns false for magnet: URLs', () => {
		expect(
			client.testShouldIgnore(
				'magnet:?xt=urn:btih:aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
			),
		).toBe(false);
	});

	test('matching is case-insensitive (URL lower-cased before check)', () => {
		// The implementation uses .toLowerCase() before matching
		expect(client.testShouldIgnore('BLOB:https://example.com/abc')).toBe(true);
		expect(client.testShouldIgnore('DATA:text/plain,hello')).toBe(true);
	});

	test('scheme must appear at the start of the URL', () => {
		// Contains "blob:" but not at the start
		expect(client.testShouldIgnore('https://example.com/?u=blob:foo')).toBe(
			false,
		);
	});
});

// ─── download ────────────────────────────────────────────────────────────

describe('download', () => {
	let client: TestBrowserClient;

	beforeEach(() => {
		jest.clearAllMocks();
		client = new TestBrowserClient();
	});

	function setupWindowMock() {
		const browser = jest.requireMock<typeof import('webextension-polyfill')>(
			'webextension-polyfill',
		);
		jest.mocked(browser.windows.getCurrent).mockResolvedValue({ id: 1 } as any);
		jest.mocked(browser.windows.remove).mockResolvedValue(undefined as any);
		jest.mocked(browser.runtime.sendMessage).mockResolvedValue(undefined);
	}

	test('sends AddUri message with filename in options', async () => {
		setupWindowMock();
		const browser = jest.requireMock<typeof import('webextension-polyfill')>(
			'webextension-polyfill',
		);

		await client.download('https://example.com/file.zip', 'file.zip', '');

		expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
			type: MessageType.AddUri,
			link: 'https://example.com/file.zip',
			filename: 'file.zip',
			options: { out: 'file.zip' },
		});
	});

	test('includes dir in options when filePath is provided', async () => {
		setupWindowMock();
		const browser = jest.requireMock<typeof import('webextension-polyfill')>(
			'webextension-polyfill',
		);

		await client.download(
			'https://example.com/file.zip',
			'file.zip',
			'/home/user/downloads',
		);

		expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
			type: MessageType.AddUri,
			link: 'https://example.com/file.zip',
			filename: 'file.zip',
			options: { out: 'file.zip', dir: '/home/user/downloads' },
		});
	});

	test('escapes backslashes in Windows file paths', async () => {
		setupWindowMock();
		const browser = jest.requireMock<typeof import('webextension-polyfill')>(
			'webextension-polyfill',
		);

		await client.download(
			'https://example.com/file.zip',
			'file.zip',
			'C:\\Users\\test\\Downloads',
		);

		expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
			type: MessageType.AddUri,
			link: 'https://example.com/file.zip',
			filename: 'file.zip',
			options: {
				out: 'file.zip',
				dir: 'C:\\\\Users\\\\test\\\\Downloads',
			},
		});
	});
});
