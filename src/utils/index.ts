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

export function getPathComponents(fullPath: string) {
  const lastSlashIndex = fullPath.lastIndexOf('/');
  const lastDotIndex = fullPath.lastIndexOf('.');

  return {
    dirname: fullPath.substring(0, lastSlashIndex),
    basename: fullPath.substring(lastSlashIndex + 1),
    basenameNoExt: fullPath.substring(lastSlashIndex + 1, lastDotIndex),
    extension:
      lastDotIndex > lastSlashIndex ? fullPath.substring(lastDotIndex) : '',
  };
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
