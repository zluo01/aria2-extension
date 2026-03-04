import { getAria2Client } from '@/lib/aria2c';
import { client } from '@/lib/browser';
import { QueryClient, queryOptions } from '@tanstack/react-query';

enum FetchKey {
  TASKS = 'tasks',
  SETTING = 'setting',
}

export const queryClient = new QueryClient();

export const getTasksQueryOptions = queryOptions({
  queryKey: [FetchKey.TASKS],
  queryFn: async () => (await getAria2Client()).getJobs(),
  refetchInterval: 1000,
});

export const getConfigurationQueryOptions = queryOptions({
  queryKey: [FetchKey.SETTING],
  queryFn: client.getConfiguration,
});
