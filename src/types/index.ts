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
    }
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
