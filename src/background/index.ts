import { AddUri, GetNumJobs } from '@/aria2';
import {
  createDownloadPanel,
  notify,
  openDetail,
  removeBlankTab,
  updateBadge,
} from '@/browser';
import { cacheRemove, cacheSet } from '@/lib/session-cache';
import { getFilename } from '@/utils';
import browser, { Downloads } from 'webextension-polyfill';

import DownloadItem = Downloads.DownloadItem;

const SKIP_DOWNLOAD_SCHEMA = [
  'blob:',
  'data:',
  'file:',
  'filesystem:',
  'content:',
  'about:',
  'chrome-extension:',
  'moz-extension:',
  'edge-extension:',
  'intent:',
];

const CONTEXT_ID = 'download-with-aria';

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: CONTEXT_ID,
    title: 'Download with Aria2',
    contexts: ['link', 'video', 'audio'],
  });
});

browser.contextMenus.onClicked.addListener(async (info, _tab) => {
  if (info.menuItemId === CONTEXT_ID) {
    try {
      const uri = escapeHTML(info.linkUrl as string);
      await AddUri(uri);
    } catch (e) {
      if (e instanceof Error) {
        await notify(`fail to download url, msg: ${e.message}`);
      }
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

async function prepareDownload(d: DownloadItem) {
  // findUrl only exists in chrome which currently not include in polyfill
  const filename = getFilename(d.filename, (d as any).finalUrl || d.url);
  await removeBlankTab();
  await createDownloadPanel({
    url: d.url,
    fileName: filename,
    fileSize: d.fileSize,
  });
}

browser.downloads.onCreated.addListener(async (downloadItem: DownloadItem) => {
  const id = downloadItem.id;

  if (
    SKIP_DOWNLOAD_SCHEMA.some(scheme =>
      downloadItem.url.toLowerCase().startsWith(scheme),
    )
  ) {
    return;
  }

  // do nothing when user choose to download with built-in downloader
  if (await cacheRemove(downloadItem.url)) {
    return;
  }

  // cleanup any built-in downloading
  try {
    await browser.downloads.cancel(id);
  } catch {
    await browser.downloads.removeFile(id);
  } finally {
    await browser.downloads.erase({ id });
  }
  await prepareDownload(downloadItem);
});

browser.runtime.onMessage.addListener((data: any) => {
  if (data.type === 'signal' && data.message) {
    return cacheSet(data.message);
  }
});

function updateActiveJobNumber() {
  GetNumJobs()
    .then(num => updateBadge(num))
    .catch(err => console.error(err));
}

setInterval(updateActiveJobNumber, 1000);
