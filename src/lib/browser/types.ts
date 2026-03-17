import type { Runtime } from 'webextension-polyfill';

import type { IConfig, Message } from '@/types';

export interface BrowserClient {
	getPlatformInfo(): Promise<Runtime.PlatformInfo>;
	getConfiguration(): Promise<IConfig>;
	setConfiguration(config: IConfig): Promise<void>;
	openDetail(fromExtension: boolean): void;
	openSetting(): Promise<void>;
	notify(msg: string): Promise<void>;
	download(url: string, filename: string, filePath: string): Promise<void>;
	saveFile(url: string, filename: string, saveAs: boolean): Promise<void>;
	updateBadge(num: number): Promise<void>;
	registerDownloadInterceptor(): void;
	sendMessage<T = void>(message: Message): Promise<T>;
}
