import { browser } from 'webextension-polyfill-ts';

export function OpenDetail(fromExtension: boolean): void {
  const url = 'AriaNg/index.html#!/settings/rpc/set/ws/127.0.0.1/6800/jsonrpc';
  browser.tabs.create({ url: url }).catch(err => console.error(err));
  if (fromExtension) {
    window.close();
  }
}

export function RemoveBlankTab(): Promise<void> {
  return browser.tabs
    .query({
      active: true,
      lastFocusedWindow: true,
      windowType: 'normal',
    })
    .then(tabsInfo => {
      if (tabsInfo[0].url === 'about:blank') {
        return browser.tabs.remove(tabsInfo[0].id as number);
      }
    });
}

export function Notify(msg: string): Promise<string> {
  return browser.notifications.create({
    type: 'basic',
    iconUrl: browser.extension.getURL('logo48.png'),
    title: 'Aria2 Extension',
    message: msg,
    eventTime: 2000,
  });
}
