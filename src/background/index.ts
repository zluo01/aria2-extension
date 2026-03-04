import { getAria2Client } from '@/lib/aria2c';
import { client } from '@/lib/browser';
import { cacheSet } from '@/lib/session-cache';
import { MessageSchema, MessageType } from '@/types';
import browser from 'webextension-polyfill';

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
      await (await getAria2Client()).addUri(uri);
    } catch (e) {
      await client.notify(`fail to download url, msg: ${e}`);
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

client.registerDownloadInterceptor();

browser.commands.onCommand.addListener((command: string) => {
  if (command === 'open_detail') {
    client.openDetail(false);
  }
});

browser.runtime.onMessage.addListener(async (data: unknown) => {
  const result = MessageSchema.safeParse(data);
  if (!result.success) {
    console.error('Invalid message', result.error);
    return;
  }
  const c = await getAria2Client();
  switch (result.data.type) {
    case MessageType.Signal:
      return cacheSet(result.data.message);
    case MessageType.GetJobs:
      return c.getJobs();
    case MessageType.GetNumJobs:
      return c.getNumJobs();
    case MessageType.AddUri:
      return c.addUri(
        result.data.link,
        result.data.filename,
        result.data.options,
      );
    case MessageType.AddUris:
      return c.addUris(...result.data.uris);
    case MessageType.StartJobs:
      return c.startJobs(...result.data.gids);
    case MessageType.PauseJobs:
      return c.pauseJobs(...result.data.gids);
    case MessageType.RemoveJobs:
      return c.removeJobs(...result.data.gids);
  }
});

function updateActiveJobNumber() {
  getAria2Client()
    .then(c => c.getNumJobs())
    .then(num => client.updateBadge(num))
    .catch(err => console.error(err));
}

setInterval(updateActiveJobNumber, 1000);
