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
  fileName?: string;
  fileSize?: string;
  header?: string[];
}

export const ACTIVE_JOB = 'active';
export const PAUSED_JOB = 'paused';

export enum Theme {
  LIGHT = 'Light',
  DARK = 'Dark',
  FOLLOWING_SYSTEM = 'Following System',
}

export interface IConfig {
  path: string;
  protocol: string;
  host: string;
  port: number;
  token: string;
  theme: Theme;
}

export const DEFAULT_CONFIG: IConfig = {
  path: '',
  protocol: 'ws',
  host: '127.0.0.1',
  port: 6800,
  token: '',
  theme: Theme.FOLLOWING_SYSTEM,
};

export interface IScript {
  name: string;
  domain: string;
  code: string;
}

export const DEFAULT_SCRIPT: IScript = {
  name: '',
  domain: '',
  code: `(function(url) {
  'use strict';
  
  // Your code here...
})();`,
};
