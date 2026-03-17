import { QueryClient, queryOptions } from '@tanstack/react-query';
import browser from 'webextension-polyfill';

import { client } from '@/lib/browser';
import { type IDownload, type IJob, MessageType, type Theme } from '@/types';

enum FetchKey {
	TASKS = 'tasks',
	SETTING = 'setting',
	THEME = 'aria2-ui-theme',
}

export const queryClient = new QueryClient();

export const getTasksQueryOptions = queryOptions({
	queryKey: [FetchKey.TASKS],
	queryFn: getJobs,
	refetchInterval: 1000,
});

export const getConfigurationQueryOptions = queryOptions({
	queryKey: [FetchKey.SETTING],
	queryFn: client.getConfiguration,
});

export const getThemeQueryOptions = queryOptions({
	queryKey: [FetchKey.THEME],
	queryFn: async (): Promise<Theme> => {
		const result = await browser.storage.local.get(FetchKey.THEME);
		return (result[FetchKey.THEME] as Theme) || 'system';
	},
	staleTime: Infinity,
});

async function getJobs(): Promise<IJob[]> {
	const jobs = await client
		.sendMessage<IJob[]>({ type: MessageType.GetJobs })
		.catch(() => null);
	return jobs ?? [];
}

export async function addUri(
	link: string,
	filename?: string,
	options?: IDownload,
) {
	return client.sendMessage({
		type: MessageType.AddUri,
		link,
		filename,
		options,
	});
}

export async function addUris(...uris: string[]) {
	return client.sendMessage({ type: MessageType.AddUris, uris });
}

export async function startJobs(...gids: string[]) {
	return client.sendMessage({ type: MessageType.StartJobs, gids });
}

export async function pauseJobs(...gids: string[]) {
	return client.sendMessage({ type: MessageType.PauseJobs, gids });
}

export async function removeJobs(...gids: string[]) {
	return client.sendMessage({ type: MessageType.RemoveJobs, gids });
}
