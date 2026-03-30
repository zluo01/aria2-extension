import browser, { type Action, type Windows } from 'webextension-polyfill';

import { cacheRemove } from '@/lib/session-cache';
import {
	type Config,
	DEFAULT_CONFIG,
	type Download,
	type FileDetail,
	type Message,
	MessageType,
	SKIP_DOWNLOAD_SCHEMES,
} from '@/types';

import type { BrowserClient } from './types';

export abstract class BaseBrowserClient<T extends { id: number }>
	implements BrowserClient
{
	protected abstract getDownloadDetail(item: T): Promise<FileDetail>;
	protected abstract createDownloadPanel(detail: FileDetail): Promise<void>;
	protected abstract initializeBrowserDownload(
		filename: string,
		saveAs: boolean,
		url: string,
		incognito: boolean,
	): Promise<void>;

	abstract registerDownloadInterceptor(): void;

	async getPlatformInfo() {
		return browser.runtime.getPlatformInfo();
	}

	async getConfiguration(): Promise<Config> {
		const config = await browser.storage.local.get('config');
		return (config.config as Config) || DEFAULT_CONFIG;
	}

	async setConfiguration(config: Config): Promise<void> {
		return browser.storage.local.set({ config });
	}

	openDetail(fromExtension: boolean): void {
		browser.storage.local
			.get('config')
			.then((data) => {
				const config = (data.config as Config) || DEFAULT_CONFIG;
				return `manager/index.html#!/settings/rpc/set/${config.protocol}/${config.host}/${config.port}/jsonrpc/${btoa(config.token)}`;
			})
			.then((url) => browser.tabs.create({ url }))
			.then(() => fromExtension && window.close())
			.catch((err) => console.error('Open Detail Page', err));
	}

	async openSetting(): Promise<void> {
		await browser.runtime.openOptionsPage();
		window.close();
	}

	protected async removeBlankTab(): Promise<void> {
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

	async notify(msg: string): Promise<void> {
		await browser.notifications.create({
			type: 'basic',
			iconUrl: browser.runtime.getURL('logo48.png'),
			title: 'Aria2 Extension',
			message: msg,
		});
	}

	async download(
		url: string,
		filename: string,
		filePath: string,
	): Promise<void> {
		try {
			const options: Download = {
				out: filename,
			};
			if (filePath) {
				options.dir = filePath.replace(/\\/g, '\\\\');
			}
			await this.sendMessage({
				type: MessageType.AddUri,
				link: url,
				filename,
				options,
			});
			const windowInfo = await this.getCurrentWindow();
			if (windowInfo.id) {
				await browser.windows.remove(windowInfo.id);
			}
		} catch (err) {
			console.error('Download', err);
		}
	}

	async saveFile(
		url: string,
		filename: string,
		saveAs: boolean,
	): Promise<void> {
		try {
			await this.signalDefaultDownload(url);
			const window = await this.getCurrentWindow();
			await this.initializeBrowserDownload(
				filename,
				saveAs,
				url,
				window.incognito,
			);
			if (window.id && window.id !== 0) {
				await browser.windows.remove(window.id);
			}
		} catch (e) {
			await this.notify(`Fail to trigger browser download: ${e}`);
		}
	}

	async updateBadge(num: number): Promise<void> {
		const value = num > 0 ? num.toString() : null;
		const color = num > 0 ? '#303030' : ([217, 0, 0, 255] as Action.ColorArray);
		await browser.action.setBadgeText({ text: value });
		await browser.action.setBadgeBackgroundColor({ color });
	}

	sendMessage<T = void>(message: Message): Promise<T> {
		return browser.runtime.sendMessage(message);
	}

	protected getCurrentWindow(): Promise<Windows.Window> {
		return browser.windows.getCurrent();
	}

	protected signalDefaultDownload(url: string): Promise<void> {
		return this.sendMessage({ type: MessageType.Signal, message: url });
	}

	protected shouldIgnoreDownloadURL(url: string) {
		return SKIP_DOWNLOAD_SCHEMES.some((scheme) =>
			url.toLowerCase().startsWith(scheme),
		);
	}

	protected async prepareDownload(detail: FileDetail): Promise<void> {
		await this.removeBlankTab();
		await this.createDownloadPanel(detail);
	}

	protected async handleDownloadIntercept(item: T): Promise<void> {
		const id = item.id;
		const fileDetail = await this.getDownloadDetail(item);
		if (this.shouldIgnoreDownloadURL(fileDetail.url)) {
			return;
		}
		if (await cacheRemove(fileDetail.url)) {
			return;
		}
		await this.cancelDownload(id);
		await this.prepareDownload(fileDetail);
	}

	protected async cancelDownload(id: number) {
		await browser.downloads.cancel(id).catch(() => {
			/* empty */
		});
		await browser.downloads.removeFile(id).catch(() => {
			/* empty */
		});
		await browser.downloads.erase({ id }).catch(() => {
			/* empty */
		});
	}
}
