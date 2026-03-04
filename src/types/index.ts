import { z } from 'zod';

export enum MessageType {
  Signal = 'signal',
  GetJobs = 'getJobs',
  GetNumJobs = 'getNumJobs',
  AddUri = 'addUri',
  AddUris = 'addUris',
  StartJobs = 'startJobs',
  PauseJobs = 'pauseJobs',
  RemoveJobs = 'removeJobs',
}

export const IDownloadSchema = z.object({
  out: z.string(),
  dir: z.string().optional(),
  header: z.array(z.string()).optional(),
});

export const MessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(MessageType.Signal), message: z.string() }),
  z.object({ type: z.literal(MessageType.GetJobs) }),
  z.object({ type: z.literal(MessageType.GetNumJobs) }),
  z.object({
    type: z.literal(MessageType.AddUri),
    link: z.string(),
    filename: z.string().optional(),
    options: IDownloadSchema.optional(),
  }),
  z.object({ type: z.literal(MessageType.AddUris), uris: z.array(z.string()) }),
  z.object({
    type: z.literal(MessageType.StartJobs),
    gids: z.array(z.string()),
  }),
  z.object({
    type: z.literal(MessageType.PauseJobs),
    gids: z.array(z.string()),
  }),
  z.object({
    type: z.literal(MessageType.RemoveJobs),
    gids: z.array(z.string()),
  }),
]);

export type Message = z.infer<typeof MessageSchema>;

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
  files: { path: string }[];
}

export type IDownload = z.infer<typeof IDownloadSchema>;

export interface IFileDetail {
  url: string;
  filename: string;
  fileSize: number;
  incognito: boolean;
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

export const SKIP_DOWNLOAD_SCHEMA = [
  'blob:',
  'data:',
  'file:',
  'filesystem:',
  'content:',
  'about:',
  'chrome-extension:',
  'moz-extension:',
  'edge-extension:',
  'intent:',
];
