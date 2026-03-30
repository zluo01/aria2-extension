/**
 * Tests for BaseBrowserClient shared logic.
 * Uses a minimal concrete subclass to exercise protected methods.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import browser from 'webextension-polyfill';

import { BaseBrowserClient } from '@/lib/browser/base';
import { type FileDetail, MessageType } from '@/types';

vi.mock('webextension-polyfill', () => {
	const mock = {
		storage: {
			local: {
				get: vi.fn(),
				set: vi.fn(),
			},
			session: {
				get: vi.fn(),
				set: vi.fn(),
				remove: vi.fn(),
			},
		},
		runtime: {
			sendMessage: vi.fn(),
			getPlatformInfo: vi.fn(),
			openOptionsPage: vi.fn(),
			getURL: vi.fn((p: unknown) => `moz-extension://test/${p}`),
		},
		tabs: { query: vi.fn(), remove: vi.fn(), create: vi.fn() },
		windows: { getCurrent: vi.fn(), remove: vi.fn() },
		notifications: { create: vi.fn() },
		action: {
			setBadgeText: vi.fn(),
			setBadgeBackgroundColor: vi.fn(),
		},
		downloads: {
			cancel: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			removeFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			erase: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		},
	};
	return { default: mock, ...mock };
});

// ─── Test subclass ────────────────────────────────────────────────────────

class TestBrowserClient extends BaseBrowserClient<{ id: number }> {
	protected async getDownloadDetail(_item: {
		id: number;
	}): Promise<FileDetail> {
		return { url: '', filename: '', fileSize: 0, incognito: false };
	}

	protected async createDownloadPanel(_detail: FileDetail): Promise<void> {
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

// ─── openDetail ──────────────────────────────────────────────────────────

describe('openDetail', () => {
	let client: TestBrowserClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new TestBrowserClient();
	});

	test('builds AriaNg URL from stored config and opens a tab', async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValue({
			config: {
				protocol: 'ws',
				host: '127.0.0.1',
				port: 6800,
				token: 'secret',
				path: '',
			},
		});
		vi.mocked(browser.tabs.create).mockResolvedValue({} as any);

		await client.openDetail(false);

		expect(browser.tabs.create).toHaveBeenCalledWith({
			url: `manager/index.html#!/settings/rpc/set/ws/127.0.0.1/6800/jsonrpc/${btoa('secret')}`,
		});
	});

	test('uses DEFAULT_CONFIG when storage has no config', async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValue({});
		vi.mocked(browser.tabs.create).mockResolvedValue({} as any);

		await client.openDetail(false);

		expect(browser.tabs.create).toHaveBeenCalledWith({
			url: `manager/index.html#!/settings/rpc/set/ws/127.0.0.1/6800/jsonrpc/${btoa('')}`,
		});
	});

	test('does not throw when tabs.create fails', async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValue({});
		vi.mocked(browser.tabs.create).mockRejectedValue(new Error('no tab'));

		await expect(client.openDetail(false)).resolves.toBeUndefined();
	});
});

// ─── getConfiguration / setConfiguration ─────────────────────────────────

describe('getConfiguration', () => {
	let client: TestBrowserClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new TestBrowserClient();
	});

	test('returns stored config from browser.storage.local', async () => {
		const stored = {
			protocol: 'wss' as const,
			host: '10.0.0.1',
			port: 6801,
			token: 'tok',
			path: '/dl',
		};
		vi.mocked(browser.storage.local.get).mockResolvedValue({
			config: stored,
		});

		const result = await client.getConfiguration();
		expect(result).toEqual(stored);
	});

	test('returns DEFAULT_CONFIG when storage is empty', async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValue({});

		const result = await client.getConfiguration();
		expect(result).toEqual({
			path: '',
			protocol: 'ws',
			host: '127.0.0.1',
			port: 6800,
			token: '',
		});
	});

	test('setConfiguration writes config to browser.storage.local', async () => {
		vi.mocked(browser.storage.local.set).mockResolvedValue(undefined as any);

		const newConfig = {
			protocol: 'https' as const,
			host: 'aria2.local',
			port: 443,
			token: 'pw',
			path: '/downloads',
		};
		await client.setConfiguration(newConfig);

		expect(browser.storage.local.set).toHaveBeenCalledWith({
			config: newConfig,
		});
	});
});

// ─── download ────────────────────────────────────────────────────────────

describe('download', () => {
	let client: TestBrowserClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new TestBrowserClient();
	});

	function setupWindowMock() {
		vi.mocked(browser.windows.getCurrent).mockResolvedValue({ id: 1 } as any);
		vi.mocked(browser.windows.remove).mockResolvedValue(undefined as any);
		vi.mocked(browser.runtime.sendMessage).mockResolvedValue(undefined);
	}

	test('sends AddUri message with filename in options', async () => {
		setupWindowMock();

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
