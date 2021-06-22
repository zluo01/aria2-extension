import { browser, WebRequest } from 'webextension-polyfill-ts';

import { AddUri, GetNumJobs } from '../aria2';
import {
  createDownloadPanel,
  notify,
  openDetail,
  removeBlankTab,
  updateBadge,
} from '../browser';
import { IFileDetail } from '../types';
import {
  applyScripts,
  correctFileName,
  getFileName,
  getRequestHeaders,
  parseBytes,
} from '../utils';

import ResourceType = WebRequest.ResourceType;
import OnSendHeadersDetailsType = WebRequest.OnSendHeadersDetailsType;
import OnHeadersReceivedDetailsType = WebRequest.OnHeadersReceivedDetailsType;
import OnErrorOccurredDetailsType = WebRequest.OnErrorOccurredDetailsType;
import BlockingResponseOrPromise = WebRequest.BlockingResponseOrPromise;

const request: OnSendHeadersDetailsType[] = [];
const processQueue: IFileDetail[] = [];
const CONTEXT_ID = 'download-with-aria';

browser.contextMenus.create({
  id: CONTEXT_ID,
  title: 'Download with Aria2',
  contexts: ['link', 'video', 'audio'],
});

browser.contextMenus.onClicked.addListener(async (info, _tab) => {
  if (info.menuItemId === CONTEXT_ID) {
    try {
      const uri = escapeHTML(info.linkUrl as string);
      const processed = await applyScripts(uri);
      await AddUri(processed[0]);
    } catch (e) {
      await notify(`fail to download url, msg: ${e.message || e}`);
    }
  }
});

// https://gist.github.com/Rob--W/ec23b9d6db9e56b7e4563f1544e0d546
function escapeHTML(str: string) {
  // Note: string cast using String; may throw if `str` is non-serializable, e.g. a Symbol.
  // Most often this is not the case though.
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

browser.commands.onCommand.addListener((command: string) => {
  if (command === 'open_detail') {
    openDetail(false);
  }
});

async function prepareDownload(d: OnHeadersReceivedDetailsType) {
  const detail: IFileDetail = { url: d.url };
  // get request item
  const id = request.findIndex(x => x.requestId === d.requestId);
  const reqFound = { ...request[id] };
  if (id >= 0) {
    // create header
    detail.header = getRequestHeaders(reqFound);
    // delete request item
    request.splice(id, 1);
  }

  // process file name
  let fileName = decodeURIComponent(getFileName(d));

  // issue #8
  try {
    fileName = decodeURI(escape(fileName));
  } catch (e) {}

  // file name cannot have ""
  fileName = fileName.replace('UTF-8', '');
  fileName = fileName.replaceAll(';', '');
  fileName = fileName.replaceAll('"', '');
  fileName = fileName.replaceAll("'", '');

  // correct File Name
  try {
    detail.fileName = await correctFileName(fileName);
    // get file size
    if (d.responseHeaders) {
      const fid = d.responseHeaders.findIndex(
        x => x.name.toLowerCase() === 'content-length'
      );
      detail.fileSize =
        fid >= 0 ? parseBytes(d.responseHeaders[fid].value as string) : '';
    }

    // create download panel
    processQueue.push(detail);
    await createDownloadPanel();
    await removeBlankTab();
  } catch (e) {
    console.error(e);
  }
}

function observeResponse(
  d: OnHeadersReceivedDetailsType
): BlockingResponseOrPromise | void {
  // bug0001: goo.gl
  if (d.statusCode === 200) {
    if (
      d.responseHeaders?.find(
        x => x.name.toLowerCase() === 'content-disposition'
      )
    ) {
      const contentDisposition = d.responseHeaders
        ?.find(x => x.name.toLowerCase() === 'content-disposition')
        ?.value?.toLowerCase();
      if (contentDisposition?.slice(0, 10) === 'attachment') {
        prepareDownload(d).catch(err => console.error(err));
        return { cancel: true };
      }
    }
    if (d.responseHeaders?.find(x => x.name.toLowerCase() === 'content-type')) {
      const contentType = d.responseHeaders
        ?.find(x => x.name.toLowerCase() === 'content-type')
        ?.value?.toLowerCase();
      if (
        contentType?.slice(0, 11) === 'application' &&
        contentType?.slice(12, 15) !== 'pdf' &&
        contentType?.slice(12, 17) !== 'xhtml' &&
        contentType?.slice(12, 23) !== 'x-xpinstall' &&
        contentType?.slice(12, 29) !== 'x-shockwave-flash' &&
        contentType?.slice(12, 15) !== 'rss' &&
        contentType?.slice(12, 16) !== 'json'
      ) {
        prepareDownload(d).catch(err => console.error(err));
        return { cancel: true };
      }
    }
  }

  // get request item and delete
  const id = request.findIndex(x => x.requestId === d.requestId);
  if (id >= 0) {
    request.splice(id, 1);
  }
}

const types: ResourceType[] = ['main_frame', 'sub_frame'];

function observeRequest(d: OnSendHeadersDetailsType) {
  request.push(d);
}

browser.webRequest.onSendHeaders.addListener(
  observeRequest,
  {
    urls: ['<all_urls>'],
    types: types,
  },
  ['requestHeaders']
);

browser.webRequest.onHeadersReceived.addListener(
  observeResponse,
  {
    urls: ['<all_urls>'],
    types: types,
  },
  ['blocking', 'responseHeaders']
);

function requestError(d: OnErrorOccurredDetailsType): void {
  const id = request.findIndex(x => x.requestId === d.requestId);
  if (id >= 0) {
    request.splice(id, 1);
  }
}

browser.webRequest.onErrorOccurred.addListener(requestError, {
  urls: ['<all_urls>'],
  types: types,
});

browser.runtime.onMessage.addListener((data, _sender) => {
  if (data.type === 'all') {
    return Promise.resolve(processQueue.pop());
  }
});

function updateActiveJobNumber() {
  GetNumJobs()
    .then(num => updateBadge(num))
    .catch(err => console.error(err));
}

updateActiveJobNumber();
setInterval(updateActiveJobNumber, 1000);
