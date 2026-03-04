import { client } from '@/lib/browser';
import { IDownload, IJob, MessageType } from '@/types';
import { QueryClient, queryOptions } from '@tanstack/react-query';

enum FetchKey {
  TASKS = 'tasks',
  SETTING = 'setting',
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

async function getJobs() {
  return client.sendMessage<IJob[]>({ type: MessageType.GetJobs });
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
