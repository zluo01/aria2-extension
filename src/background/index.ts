import browser from 'webextension-polyfill';

import { aria2Client } from '@/lib/aria2c';
import { client } from '@/lib/browser';
import { cacheSet } from '@/lib/session-cache';
import { MessageSchema, MessageType } from '@/types';

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
    const url = info.srcUrl ?? info.linkUrl;
    if (!url) {
      return;
    }
    try {
      const c = await aria2Client();
      await c.addUri(url);
    } catch (e) {
      await client.notify(`Fail to download with Aria2: ${e}`);
    }
  }
});

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
  const c = await aria2Client();
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

async function updateActiveJobNumber(): Promise<void> {
  return aria2Client()
    .then(o => o.getNumJobs())
    .then(num => client.updateBadge(num))
    .catch(err => console.error(err))
    .finally(() => setTimeout(updateActiveJobNumber, 1000));
}

updateActiveJobNumber();
