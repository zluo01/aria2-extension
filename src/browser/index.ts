import { AddUri } from '@/aria2';
import { DEFAULT_CONFIG, IConfig, IDownload, IFileDetail } from '@/types';
import browser, { Action, Windows } from 'webextension-polyfill';

export async function getConfiguration(): Promise<IConfig> {
  const config = await browser.storage.local.get('config');
  return (config.config as IConfig) || DEFAULT_CONFIG;
}

export async function setConfiguration(config: IConfig): Promise<void> {
  return browser.storage.local.set({ config });
}

export function openDetail(fromExtension: boolean): void {
  getConfiguration()
    .then(
      config =>
        `manager/index.html#!/settings/rpc/set/${config.protocol}/${
          config.host
        }/${config.port}/jsonrpc/${btoa(config.token)}`,
    )
    .then(url => browser.tabs.create({ url }))
    .then(() => fromExtension && window.close())
    .catch(err => console.error('Open Detail Page', err));
}

export async function openSetting(): Promise<void> {
  await browser.runtime.openOptionsPage();
  window.close();
}

export async function removeBlankTab(): Promise<void> {
  try {
    const tabsInfo = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
      windowType: 'normal',
    });
    if (
      tabsInfo?.length > 0 &&
      (tabsInfo[0].url === 'about:blank' || tabsInfo[0].title === 'New Tab')
    ) {
      await browser.tabs.remove(tabsInfo[0].id as number);
    }
  } catch (err) {
    console.error('Remove Blank Tab', err);
  }
}

export async function notify(msg: string): Promise<string> {
  return browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('logo48.png'),
    title: 'Aria2 Extension',
    message: msg,
  });
}

// https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
export async function createDownloadPanel(): Promise<Windows.Window> {
  const w = 560;
  const h = 365;

  const url = browser.runtime.getURL('index.html');
  const windowInfo = await getCurrentWindow();

  const createOptions: Windows.CreateCreateDataType = {
    url: url.concat('#/download'),
    type: 'popup',
    width: w,
    height: h,
    incognito: windowInfo.incognito,
    focused: true,
  };

  // todo: find a way to support following in chrome
  if (typeof window !== 'undefined') {
    // Fixes dual-screen position  Most browsers      Firefox
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
    const top = Math.round((height - h) / 2 / systemZoom + dualScreenTop);
    const left = Math.round((width - w) / 2 / systemZoom + dualScreenLeft);

    createOptions.top = top;
    createOptions.left = left;
  }

  return browser.windows.create(createOptions);
}

export async function getJobDetail(): Promise<IFileDetail> {
  return browser.runtime.sendMessage({
    type: 'all',
  });
}

export async function download(
  url: string,
  fileName: string,
  filePath: string,
  header: string[],
): Promise<void> {
  try {
    const options: IDownload = {
      out: fileName,
    };
    if (filePath) {
      options.dir = filePath.replace(/\\/g, '\\\\');
    }
    if (header) {
      options.header = header as string[];
    }
    await AddUri(url, fileName, options);
    const windowInfo = await getCurrentWindow();
    if (windowInfo.id) {
      await browser.windows.remove(windowInfo.id);
    }
  } catch (err) {
    console.error('Download', err);
  }
}

async function signalDefaultDownload(url: string): Promise<void> {
  return browser.runtime.sendMessage({
    type: 'signal',
    message: url,
  });
}

// stupid way to handling chrome only behavior
function isChrome() {
  const globalChrome = (globalThis as any).chrome;
  return !!(globalChrome && globalChrome.runtime && globalChrome.runtime.id);
}

export async function saveFile(
  url: string,
  fileName: string,
  as: boolean,
): Promise<void> {
  try {
    await signalDefaultDownload(url);
    const window = await getCurrentWindow();
    const downloadOptions: browser.Downloads.DownloadOptionsType =
      fileName !== ''
        ? {
            filename: fileName,
            saveAs: as,
            url,
          }
        : {
            saveAs: as,
            url,
          };
    // incognito only support in firefox
    if (!isChrome()) {
      downloadOptions.incognito = window.incognito;
    }
    await browser.downloads.download(downloadOptions);
    if (window.id && window.id !== 0) {
      await browser.windows.remove(window.id);
    }
  } catch (err) {
    if (err instanceof Error) {
      await notify(err.message);
    }
  }
}

async function getCurrentWindow(): Promise<Windows.Window> {
  return browser.windows.getCurrent();
}

export async function updateBadge(num: number): Promise<void> {
  const value = num > 0 ? num.toString() : null;
  const color = num > 0 ? '#303030' : ([217, 0, 0, 255] as Action.ColorArray);
  await browser.action.setBadgeText({ text: value });
  await browser.action.setBadgeBackgroundColor({ color });
}
