import { browser, WebRequest } from 'webextension-polyfill-ts';
import { AddUri } from '../aria2';
import { IDownload } from '../types';

import OnHeadersReceivedDetailsType = WebRequest.OnHeadersReceivedDetailsType;
import OnSendHeadersDetailsType = WebRequest.OnSendHeadersDetailsType;

export async function correctFileName(name: string): Promise<string> {
  let tmp = name;
  await browser.runtime.getPlatformInfo().then(e => {
    tmp = tmp.replace('/[<>:"/\\|?*\x00-\x1F]/g', '_');
    if (e.os === 'win') {
      if (tmp.search(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i) !== -1)
        tmp = '_' + tmp;
      if (tmp[tmp.length - 1] === ' ' || tmp[tmp.length - 1] === '.')
        tmp = tmp.slice(0, tmp.length - 1);
    }
  });
  return tmp;
}

export function getFileName(d: OnHeadersReceivedDetailsType): string {
  if (!d.responseHeaders) {
    return '';
  }

  // get file name
  const id = d.responseHeaders.findIndex(
    x => x.name.toLowerCase() === 'content-disposition'
  );
  if (id && id >= 0) {
    // eslint-disable-next-line no-control-regex
    const PARAM_REGEXP = /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g;
    const EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/;
    const QESC_REGEXP = '/\\([\u0000-\u007f])/g';

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

export function getRequestHeaders(d: OnSendHeadersDetailsType): string[] {
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

export function download(
  url: string,
  fileName: string,
  header: string | string[]
): void {
  const options: IDownload = {
    out: fileName,
  };
  if (header !== '[]') {
    options.header = header as string[];
  }
  AddUri(url, fileName, options);
}
