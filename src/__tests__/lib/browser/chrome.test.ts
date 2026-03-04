/**
 * Tests for ChromeClient browser-specific logic.
 *
 * Key differences from FirefoxClient:
 *   - filename comes directly from item.filename (no path splitting)
 *   - url uses item.finalUrl ?? item.url (finalUrl is the post-redirect URL)
 *   - fileSize comes directly from item.fileSize (no HEAD request)
 *   - incognito is not supported in initializeBrowserDownload options
 */
import { ChromeClient } from '@/lib/browser/chrome';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────

jest.mock('@/lib/queries', () => ({
  addUri: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

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
    getURL: jest.fn((p: unknown) => `chrome-extension://test/${p}`),
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
    onDeterminingFilename: { addListener: jest.fn() },
  },
}));

// Chrome global mock — ChromeClient calls chrome.* APIs directly
const mockChromeDownload = jest
  .fn<(opts: any) => Promise<number>>()
  .mockResolvedValue(1);
const mockChromeWindowsCreate = jest
  .fn<(opts: any) => Promise<chrome.windows.Window>>()
  .mockResolvedValue({ id: 1 } as chrome.windows.Window);

beforeEach(() => {
  (global as any).chrome = {
    runtime: {
      getURL: jest.fn((p: string) => `chrome-extension://ext/${p}`),
    },
    windows: { create: mockChromeWindowsCreate },
    downloads: {
      download: mockChromeDownload,
      onDeterminingFilename: { addListener: jest.fn() },
    },
  };
  jest.clearAllMocks();
});

// ─── helpers ──────────────────────────────────────────────────────────────

function makeItem(
  overrides: Partial<{
    id: number;
    url: string;
    finalUrl: string | undefined;
    filename: string;
    fileSize: number;
    incognito: boolean;
  }> = {},
) {
  return {
    id: 1,
    url: 'https://example.com/file.zip',
    finalUrl: 'https://cdn.example.com/file.zip',
    filename: 'file.zip',
    fileSize: 1048576,
    incognito: false,
    ...overrides,
  } as unknown as chrome.downloads.DownloadItem;
}

// ─── getDownloadDetail ────────────────────────────────────────────────────

describe('ChromeClient.getDownloadDetail', () => {
  test('uses item.filename directly without any path splitting', async () => {
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ filename: 'ubuntu-24.04.4-desktop-amd64.iso' }),
    );
    expect(detail.filename).toBe('ubuntu-24.04.4-desktop-amd64.iso');
  });

  test('uses item.fileSize directly without issuing a HEAD request', async () => {
    const mockFetch = jest.spyOn(global, 'fetch' as any);
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ fileSize: 6655619072 }),
    );
    expect(detail.fileSize).toBe(6655619072);
    expect(mockFetch).not.toHaveBeenCalled();
    mockFetch.mockRestore();
  });

  test('uses item.finalUrl as the download URL', async () => {
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ finalUrl: 'https://mirror.example.com/file.zip' }),
    );
    expect(detail.url).toBe('https://mirror.example.com/file.zip');
  });

  test('falls back to item.url when finalUrl is undefined', async () => {
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({
        url: 'https://example.com/original.zip',
        finalUrl: undefined,
      }),
    );
    expect(detail.url).toBe('https://example.com/original.zip');
  });

  test('passes incognito flag from download item', async () => {
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ incognito: true }),
    );
    expect(detail.incognito).toBe(true);
  });

  test('fileSize of 0 is preserved as-is (empty file)', async () => {
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ fileSize: 0 }),
    );
    expect(detail.fileSize).toBe(0);
  });

  test('fileSize of -1 is preserved as-is (unknown size)', async () => {
    // Chrome may report -1 when file size is unknown
    const client = new ChromeClient();
    const detail = await (client as any).getDownloadDetail(
      makeItem({ fileSize: -1 }),
    );
    expect(detail.fileSize).toBe(-1);
  });
});

// ─── initializeBrowserDownload ────────────────────────────────────────────

describe('ChromeClient.initializeBrowserDownload', () => {
  test('calls chrome.downloads.download with filename, saveAs, and url', async () => {
    const client = new ChromeClient();
    await (client as any).initializeBrowserDownload(
      'ubuntu.iso',
      false,
      'https://example.com/ubuntu.iso',
      false,
    );
    expect(mockChromeDownload).toHaveBeenCalledWith({
      filename: 'ubuntu.iso',
      saveAs: false,
      url: 'https://example.com/ubuntu.iso',
    });
  });

  test('omits filename from options when filename is empty string', async () => {
    const client = new ChromeClient();
    await (client as any).initializeBrowserDownload(
      '',
      true,
      'https://example.com/file.zip',
      false,
    );
    const opts = mockChromeDownload.mock.calls[0][0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('filename');
    expect(opts.saveAs).toBe(true);
    expect(opts.url).toBe('https://example.com/file.zip');
  });

  test('does not pass incognito to chrome.downloads.download (unsupported)', async () => {
    const client = new ChromeClient();
    await (client as any).initializeBrowserDownload(
      'file.zip',
      false,
      'https://example.com/file.zip',
      true, // incognito=true is passed in but should not appear in options
    );
    const opts = mockChromeDownload.mock.calls[0][0] as Record<string, unknown>;
    expect(opts).not.toHaveProperty('incognito');
  });
});
