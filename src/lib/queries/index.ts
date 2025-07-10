import { AddUris, GetJobs } from '@/aria2';
import { download, getConfiguration, setConfiguration } from '@/browser';
import { IConfig } from '@/types';
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';

enum FetchKey {
  TASKS = 'tasks',
  SETTING = 'setting',
}

export const queryClient = new QueryClient();

export function useGetTasksQuery() {
  return useQuery({
    queryKey: [FetchKey.TASKS],
    queryFn: GetJobs,
    refetchInterval: 1000,
  });
}

export function useGetConfigurationQuery() {
  return useQuery({
    queryKey: [FetchKey.SETTING],
    queryFn: getConfiguration,
  });
}

export function useUpdateConfigMutation() {
  return useMutation({
    mutationFn: async (config: IConfig) => {
      return await setConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FetchKey.SETTING] });
    },
  });
}

export function useSubmitTasksMutation() {
  return useMutation({
    mutationFn: async (uris: string[]) => {
      return AddUris(...uris);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FetchKey.TASKS] });
    },
  });
}

export function useDownloadMutation() {
  return useMutation({
    mutationFn: async ({
      url,
      fileName,
      filePath,
      headers,
    }: {
      url: string;
      fileName: string;
      filePath: string;
      headers: string[];
    }) => {
      return await download(url, fileName, filePath, headers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FetchKey.TASKS] });
    },
  });
}
