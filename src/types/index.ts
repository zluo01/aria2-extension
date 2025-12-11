export interface IJob {
  gid: string;
  downloadSpeed: string;
  completedLength: string;
  totalLength: string;
  status: string;
  bittorrent?: {
    info: {
      name: string;
    };
  };
  files: [
    {
      path: string;
    },
  ];
}

export interface IDownload {
  out: string;
  dir?: string;
  header?: string[];
}

export interface IFileDetail {
  url: string;
  fileName: string;
  fileSize: number;
  header?: string[];
}

export const ACTIVE_JOB = 'active';
export const PAUSED_JOB = 'paused';

export interface IConfig {
  path: string;
  protocol: string;
  host: string;
  port: number;
  token: string;
}

export const DEFAULT_CONFIG: IConfig = {
  path: '',
  protocol: 'ws',
  host: '127.0.0.1',
  port: 6800,
  token: '',
};
