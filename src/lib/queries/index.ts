import { AddUris, GetJobs } from '@/aria2';
import { download, getConfiguration } from '@/browser';
import { IConfig, IJob } from '@/types';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

enum FetchKey {
  TASKS = 'tasks',
  SETTING = 'setting',
}

export function useGetTasksQuery() {
  return useSWR<IJob[]>(FetchKey.TASKS, GetJobs, {
    refreshInterval: 1000,
  });
}

export function useGetConfigurationQuery() {
  return useSWR<IConfig>(FetchKey.SETTING, getConfiguration);
}

export function useSubmitTasksTrigger() {
  return useSWRMutation(FetchKey.TASKS, (_url, opts: { arg: string[] }) =>
    AddUris(...opts.arg),
  );
}

export function useDownloadTrigger() {
  return useSWRMutation(
    FetchKey.TASKS,
    async (
      _url,
      opts: {
        arg: {
          url: string;
          fileName: string;
          filePath: string;
          headers: string[];
        };
      },
    ) => {
      const { url, fileName, filePath, headers } = opts.arg;
      await download(url, fileName, filePath, headers);
    },
  );
}
