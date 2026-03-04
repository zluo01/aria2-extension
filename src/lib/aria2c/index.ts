import { Aria2Client } from '@/lib/aria2c/client';
import { client } from '@/lib/browser';
import { IConfig } from '@/types';

let instance: Aria2Client | undefined;
let prevConfig: IConfig | undefined;

function isSameConfig(a: IConfig, b: IConfig): boolean {
  return (
    a.host === b.host &&
    a.port === b.port &&
    a.protocol === b.protocol &&
    a.token === b.token &&
    a.path === b.path
  );
}

export async function getAria2Client(): Promise<Aria2Client> {
  const config = await client.getConfiguration();
  if (!instance || !prevConfig || !isSameConfig(prevConfig, config)) {
    instance = new Aria2Client(config);
    prevConfig = config;
  }
  return instance;
}
