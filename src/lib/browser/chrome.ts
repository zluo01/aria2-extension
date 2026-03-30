import { downloadToQueryString } from '@/lib/utils';
import type { FileDetail } from '@/types';

import { BaseBrowserClient } from './base';

export class ChromeClient extends BaseBrowserClient<chrome.downloads.DownloadItem> {
	async createDownloadPanel(detail: FileDetail): Promise<void> {
		try {
			const w = 560;
			const h = 365;

			const baseUrl = chrome.runtime.getURL('index.html');

			const createOptions: chrome.windows.CreateData = {
				url: `${baseUrl}#/download?${downloadToQueryString(detail)}`,
				type: 'popup',
				width: w,
				height: h,
				incognito: detail.incognito,
				focused: true,
			};

			await chrome.windows.create(createOptions);
		} catch (e) {
			console.error(`Fail to create download panel. ${e}`);
		}
	}

	/*
  {
     "bytesReceived":0,
     "canResume":false,
     "danger":"safe",
     "exists":true,
     "fileSize":6655619072,
     "filename":"ubuntu-24.04.4-desktop-amd64.iso",
     "finalUrl":"https://releases.ubuntu.com/24.04.4/ubuntu-24.04.4-desktop-amd64.iso",
     "id":1,
     "incognito":false,
     "mime":"application/x-iso9660-image",
     "paused":false,
     "referrer":"https://ubuntu.com/",
     "startTime":"2026-03-03T10:16:11.148Z",
     "state":"in_progress",
     "totalBytes":6655619072,
     "url":"https://releases.ubuntu.com/24.04.4/ubuntu-24.04.4-desktop-amd64.iso"
  }
   */
	protected async getDownloadDetail(
		item: chrome.downloads.DownloadItem,
	): Promise<FileDetail> {
		return {
			filename: item.filename,
			fileSize: item.fileSize,
			url: item.finalUrl ?? item.url,
			incognito: item.incognito,
		};
	}

	protected async initializeBrowserDownload(
		filename: string,
		saveAs: boolean,
		url: string,
		_incognito: boolean,
	): Promise<void> {
		const downloadOptions: chrome.downloads.DownloadOptions =
			filename !== '' ? { filename, saveAs, url } : { saveAs, url };
		await chrome.downloads.download(downloadOptions);
	}

	registerDownloadInterceptor(): void {
		chrome.downloads.onDeterminingFilename.addListener(async (downloadItem) => {
			try {
				await this.handleDownloadIntercept(downloadItem);
			} catch (e) {
				console.error('Download interceptor error', e);
			}
		});
	}
}
