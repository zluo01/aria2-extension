import browser from 'webextension-polyfill';

const INVALID_FILENAME_REGEX = /[\\/:"*?<>| ]/g;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export async function verifyFileName(name: string): Promise<boolean> {
  if (!name || name.trim() !== name) {
    return false;
  }

  const invalidChars = name.match(INVALID_FILENAME_REGEX);
  if (invalidChars) {
    return false;
  }

  const platformInfo = await browser.runtime.getPlatformInfo();
  if (platformInfo.os === 'win') {
    // Check for Windows reserved names
    if (WINDOWS_RESERVED_NAMES.test(name)) {
      return false;
    }

    // Check for trailing spaces or dots
    if (name.endsWith(' ') || name.endsWith('.')) {
      return false;
    }
  }
  return true;
}

export function getFilename(fullPath: string, url: string): string {
  if (fullPath.trim() === '') {
    // fallback to name from url in chrome
    try {
      const u = new URL(url);
      return u.pathname.split('/').pop() || 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }
  const lastSlashIndex = fullPath.lastIndexOf('/');
  return fullPath.substring(lastSlashIndex + 1);
}

export function parseBytes(value: number): string {
  const symbol = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let speed = value;
  let order = 0;
  while (speed >= 1000 && order < symbol.length - 1) {
    order++;
    speed = speed / 1000;
  }

  return `${speed.toFixed(2)} ${symbol[order]}`;
}
