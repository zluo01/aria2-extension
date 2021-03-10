import { browser, Windows } from 'webextension-polyfill-ts';
import { IDownload, IFileDetail } from '../types';
import { AddUri } from '../aria2';

export function openDetail(fromExtension: boolean): void {
  const url = 'AriaNg/index.html#!/settings/rpc/set/ws/127.0.0.1/6800/jsonrpc';
  browser.tabs.create({ url: url }).catch(err => console.error(err));
  if (fromExtension) {
    window.close();
  }
}

export function removeBlankTab(): Promise<void> {
  return browser.tabs
    .query({
      active: true,
      lastFocusedWindow: true,
      windowType: 'normal',
    })
    .then(tabsInfo => {
      if (tabsInfo && tabsInfo[0].url === 'about:blank') {
        return browser.tabs.remove(tabsInfo[0].id as number);
      }
    });
}

export function notify(msg: string): Promise<string> {
  return browser.notifications.create({
    type: 'basic',
    iconUrl: browser.extension.getURL('logo48.png'),
    title: 'Aria2 Extension',
    message: msg,
    eventTime: 2000,
  });
}

// https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
export function createDownloadPanel(): Promise<Windows.Window> {
  const w = 520;
  const h = 330;
  // Fixes dual-screen position                             Most browsers      Firefox
  const dualScreenLeft =
    window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop =
    window.screenTop !== undefined ? window.screenTop : window.screenY;

  const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : screen.width;
  const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : screen.height;

  const systemZoom = width / window.screen.availWidth;
  const left = (width - w) / 2 / systemZoom + dualScreenLeft;
  const top = (height - h) / 2 / systemZoom + dualScreenTop;

  const url = browser.runtime.getURL('target/download.html');

  return getCurrentWindow().then(windowInfo =>
    browser.windows.create({
      top: Math.round(top),
      left: Math.round(left),
      url: url,
      type: 'popup',
      width: w,
      height: h,
      incognito: windowInfo.incognito,
    })
  );
}

export function getJobDetail(): Promise<IFileDetail> {
  return browser.runtime.sendMessage({
    type: 'all',
  });
}

export function download(
  url: string,
  fileName: string,
  filePath: string,
  header: string[]
): void {
  const options: IDownload = {
    out: fileName,
  };
  if (filePath) {
    options.dir = filePath.replace(/\\/g, '\\\\');
  }
  if (header) {
    options.header = header as string[];
  }
  AddUri(url, fileName, options);
  getCurrentWindow()
    .then(windowInfo => {
      if (windowInfo.id) {
        return browser.windows.remove(windowInfo.id);
      }
    })
    .catch(err => console.error(err));
}

export function saveFile(url: string, fileName: string, as: boolean): void {
  let windowID: number | undefined;
  getCurrentWindow()
    .then(window => {
      windowID = window.id;
      return fileName !== ''
        ? {
            // conflictAction: "prompt",  //not work
            filename: fileName,
            incognito: window.incognito, // not work under 57
            saveAs: as,
            url: url,
          }
        : {
            // conflictAction: "prompt",  //not work
            incognito: window.incognito, // not work under 57
            saveAs: as,
            url: url,
          };
    })
    .then(options => browser.downloads.download(options))
    .then(() => {
      if (windowID && windowID !== 0) {
        return browser.windows.remove(windowID);
      }
    })
    .catch(err => notify(err.message || err));
}

function getCurrentWindow(): Promise<Windows.Window> {
  return browser.windows.getCurrent();
}
