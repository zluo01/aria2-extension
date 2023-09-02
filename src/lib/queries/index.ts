import { AddUris, GetJobs } from '@src/aria2';
import { download, getConfiguration, getScripts } from '@src/browser';
import { IConfig, IJob, IScript } from '@src/types';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

enum FetchKey {
  TASKS = 'tasks',
  SETTING = 'setting',
  SCRIPTS = 'scripts',
}

export function useGetTasksQuery() {
  return useSWR<IJob[]>(FetchKey.TASKS, GetJobs, {
    refreshInterval: 1000,
  });
}

export function useGetConfigurationQuery() {
  return useSWR<IConfig>(FetchKey.SETTING, getConfiguration);
}

export function useGetScriptsQuery() {
  return useSWR<IScript[]>(FetchKey.SCRIPTS, getScripts);
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
