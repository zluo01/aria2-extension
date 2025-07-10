import browser from 'webextension-polyfill';

// eslint-disable-next-line no-control-regex
const regex = /[<>:"/\\|?*\x00-\x1F]/g;

export async function verifyFileName(name: string): Promise<boolean> {
  const platformInfo = await browser.runtime.getPlatformInfo();
  let tmp: any = name.match(regex) || [];
  if (platformInfo.os === 'win') {
    if (name.search(/^(con|prn|aux|nul|com\d|lpt\d)$/i) !== -1) {
      tmp = tmp.concat(name);
    }
    if (name[name.length - 1] === ' ' || name[name.length - 1] === '.') {
      tmp = tmp.concat('Filenames cannot end in a space or dot.');
    }
  }
  return tmp.length !== 0;
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
