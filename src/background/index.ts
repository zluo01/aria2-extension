import { browser, WebRequest } from 'webextension-polyfill-ts';
import { AddUri } from '../aria2';
import { OpenDetail, RemoveBlankTab } from '../browser';
import {
  correctFileName,
  download,
  getFileName,
  getRequestHeaders,
} from '../utils';
import ResourceType = WebRequest.ResourceType;
import OnSendHeadersDetailsType = WebRequest.OnSendHeadersDetailsType;
import OnHeadersReceivedDetailsType = WebRequest.OnHeadersReceivedDetailsType;
import OnErrorOccurredDetailsType = WebRequest.OnErrorOccurredDetailsType;
import BlockingResponseOrPromise = WebRequest.BlockingResponseOrPromise;

const request: OnSendHeadersDetailsType[] = [];
const CONTEXT_ID = 'download-with-aria';

browser.contextMenus.create({
  id: CONTEXT_ID,
  title: 'Download with Aria2',
  contexts: ['link'],
});

browser.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === CONTEXT_ID) {
    AddUri(escapeHTML(info.linkUrl as string));
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
    OpenDetail(false);
  }
});

async function prepareDownload(d: OnHeadersReceivedDetailsType) {
  // get request item
  const id = request.findIndex(x => x.requestId === d.requestId);
  const reqFound = { ...request[id] };
  let requestHeaders;
  if (id >= 0) {
    // create header
    requestHeaders = getRequestHeaders(reqFound);
    // delete request item
    request.splice(id, 1);
  } else {
    requestHeaders = '[]';
  }

  // process file name
  let fileName = decodeURIComponent(getFileName(d));

  // issue #8
  try {
    fileName = decodeURI(escape(fileName));
  } catch (e) {}

  // file name cannot have ""
  fileName = fileName.replace('";', '');
  fileName = fileName.replace('"', '');
  fileName = fileName.replace('"', '');

  // correct File Name
  correctFileName(fileName).then(name => {
    fileName = name;
  });

  // create download panel
  download(d.url, fileName, requestHeaders);

  // avoid blank new tab
  RemoveBlankTab().catch(err => console.error(err));
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
