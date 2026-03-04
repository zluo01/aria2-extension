import { Aria2Client } from '@/lib/aria2c/client';
import { client } from '@/lib/browser';

let instance: Aria2Client | undefined;

export async function getAria2Client(): Promise<Aria2Client> {
  const config = await client.getConfiguration();
  if (!instance || instance.shouldReset(config)) {
    instance = new Aria2Client(config);
  }
  return instance;
}
