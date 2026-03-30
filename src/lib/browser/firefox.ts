import browser, { type Downloads, type Windows } from 'webextension-polyfill';

import { downloadToQueryString } from '@/lib/utils';
import type { IFileDetail } from '@/types';

import { IBaseBrowserClient } from './base';

export class FirefoxClient extends IBaseBrowserClient<Downloads.DownloadItem> {
	/**
	 * https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
	 * @param detail
	 */
	async createDownloadPanel(detail: IFileDetail): Promise<void> {
		try {
			const w = 560;
			const h = 365;

			const baseUrl = browser.runtime.getURL('index.html');

			// Fixes dual-screen position
			const dualScreenLeft = window.screenLeft ?? window.screenX;
			const dualScreenTop = window.screenTop ?? window.screenY;

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

			const createOptions: Windows.CreateCreateDataType = {
				url: `${baseUrl}#/download?${downloadToQueryString(detail)}`,
				type: 'popup',
				top,
				left,
				width: w,
				height: h,
				incognito: detail.incognito,
				focused: true,
			};

			await browser.windows.create(createOptions);
		} catch (e) {
			console.error(`Fail to create download panel. ${e}`);
		}
	}

	/*
  {
     "id":1,
     "url":"https://mirrors.mit.edu/ubuntu-releases/24.04.4/ubuntu-24.04.4-desktop-amd64.iso",
     "referrer":"https://ubuntu.com/download/desktop/thank-you?version=24.04.4&architecture=amd64&lts=true",
     "filename":"<PATH_PLACEHOLDER>/ubuntu-24.04.4-desktop-amd64.iso",
     "incognito":false,
     "cookieStoreId":"firefox-default",
     "danger":"safe",
     "mime":"application/x-cd-image",
     "startTime":"2026-03-03T04:47:41.986Z",
     "endTime":null,
     "state":"in_progress",
     "paused":false,
     "canResume":false,
     "error":null,
     "bytesReceived":0,
     "totalBytes":-1,
     "fileSize":-1,
     "exists":false
  }
   */
	protected async getDownloadDetail(
		item: Downloads.DownloadItem,
	): Promise<IFileDetail> {
		return {
			filename: item.filename.split(/[/\\]/).pop() || 'UNKNOWN',
			fileSize: await this.getContentLength(item.url),
			url: item.url,
			incognito: item.incognito,
		};
	}

	private async getContentLength(url: string): Promise<number> {
		try {
			const response = await fetch(url, {
				method: 'HEAD',
				credentials: 'include',
			});

			const length = response.headers.get('content-length');

			if (!length) return -1;
			const parsed = parseInt(length, 10);
			return Number.isNaN(parsed) ? -1 : parsed;
		} catch {
			return -1;
		}
	}

	protected async initializeBrowserDownload(
		filename: string,
		saveAs: boolean,
		url: string,
		incognito: boolean,
	): Promise<void> {
		const downloadOptions: browser.Downloads.DownloadOptionsType =
			filename !== ''
				? { filename, saveAs, url, incognito }
				: { saveAs, url, incognito };
		await browser.downloads.download(downloadOptions);
	}

	registerDownloadInterceptor(): void {
		browser.downloads.onCreated.addListener(async (downloadItem) => {
			try {
				await this.handleDownloadIntercept(downloadItem);
			} catch (e) {
				console.error('Download interceptor error', e);
			}
		});
	}
}
