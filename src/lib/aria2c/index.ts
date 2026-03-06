import { Aria2Client } from '@/lib/aria2c/client';
import { client } from '@/lib/browser';

let singletonPromise: Promise<Aria2Client> | null = null;

export async function aria2Client(): Promise<Aria2Client> {
  if (!singletonPromise) {
    singletonPromise = client
      .getConfiguration()
      .then(config => new Aria2Client(config));
  }

  const instance = await singletonPromise;
  const config = await client.getConfiguration();
  if (instance.shouldReset(config)) {
    instance.close();
    const newInstance = new Aria2Client(config);
    singletonPromise = Promise.resolve(newInstance);
    return newInstance;
  }
  return instance;
}
