import browser, { WebRequest } from 'webextension-polyfill';

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

export async function correctFileName(name: string): Promise<string> {
  let tmp = name;
  const platformInfo = await browser.runtime.getPlatformInfo();
  tmp = tmp.replace(regex, '_');
  if (platformInfo.os === 'win') {
    if (tmp.search(/^(con|prn|aux|nul|com\d|lpt\d)$/i) !== -1) tmp = '_' + tmp;
    if (tmp[tmp.length - 1] === ' ' || tmp[tmp.length - 1] === '.')
      tmp = tmp.slice(0, tmp.length - 1);
  }
  return tmp;
}

export function getFileName(
  d: WebRequest.OnHeadersReceivedDetailsType,
): string {
  if (!d.responseHeaders) {
    return '';
  }
  // get file name
  const id = d.responseHeaders.findIndex(
    x => x.name.toLowerCase() === 'content-disposition',
  );
  if (id >= 0) {
    const PARAM_REGEXP =
      // eslint-disable-next-line no-control-regex
      /;[\x09\x20]*([!#$%&'*+.\dA-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.\dA-Z^_`a-z|~-]+)[\x09\x20]*/g;
    const EXT_VALUE_REGEXP =
      /^([A-Za-z\d!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[\dA-Fa-f]{2}|[A-Za-z\d!#$&+.^_`|~-])+)$/;
    // eslint-disable-next-line no-control-regex
    const QESC_REGEXP = /\\([\u0000-\u007f])/g;

    const string = d.responseHeaders[id].value;

    const match = PARAM_REGEXP.exec(string as string);
    if (!match) {
      return getFileNameURL(d.url);
    }

    const key = match[1].toLowerCase();
    let value = match[2];

    if (key.indexOf('*') + 1 === key.length) {
      if (!EXT_VALUE_REGEXP.exec(value)) {
        return getFileNameURL(d.url);
      } else {
        value = match[2];
      }
    }

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value.substr(1, value.length - 2).replace(QESC_REGEXP, '$1');
    }
    return value;
  }
  return getFileNameURL(d.url);
}

function getFileNameURL(url: string) {
  const id = url.lastIndexOf('/');
  if (id >= 0) {
    const id1 = url.lastIndexOf('?');
    if (id1 === -1) {
      return url.slice(id + 1);
    }
    return url.slice(id + 1, id1);
  }
  return '';
}

export function getRequestHeaders(
  d: WebRequest.OnSendHeadersDetailsType,
): string[] {
  // create header
  const requestHeaders: string[] = [];
  if (!d.requestHeaders) {
    return requestHeaders;
  }
  const headers = ['Referer', 'Cookie', 'Cookie2', 'Authorization'];
  for (let i = 0; i < headers.length; i++) {
    const j = d.requestHeaders.findIndex(x => x.name === headers[i]);
    if (j >= 0) {
      requestHeaders[i] =
        d.requestHeaders[j].name + ': ' + d.requestHeaders[j].value;
    }
  }
  return requestHeaders;
}

export function parseBytes(value: string): string {
  const symbol = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let speed = parseFloat(value);
  let order = 0;
  while (speed >= 1000 && order < symbol.length - 1) {
    order++;
    speed = speed / 1000;
  }

  return `${speed.toFixed(2)} ${symbol[order]}`;
}
