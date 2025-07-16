import { Runtime } from 'webextension-polyfill';

import PlatformOs = Runtime.PlatformOs;

const INVALID_FILENAME_REGEX = /[<>:"/\\|?*\p{C}]/u;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

export function verifyFileName(name: string, os: PlatformOs): boolean {
  if (!name || name.trim() !== name) {
    return false;
  }

  const invalidChars = name.match(INVALID_FILENAME_REGEX);
  if (invalidChars) {
    return false;
  }

  if (os === 'win') {
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
  return fullPath.split(/[/\\]/).pop() || 'UNKNOWN';
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
