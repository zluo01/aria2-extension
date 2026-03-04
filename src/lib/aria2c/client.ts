import { Aria2Options } from '@/lib/aria2c/types';
import { client } from '@/lib/browser';
import { IConfig, IDownload, IJob } from '@/types';

import { Aria2 } from './service';

type Aria2ClientType = 'ws' | 'http';

export class Aria2Client {
  private readonly protocol: Aria2ClientType;
  private aria2: Aria2;

  constructor(config: IConfig) {
    const options: Aria2Options = {
      path: '/jsonrpc',
      host: config.host,
      port: config.port,
      secure: config.protocol === 'https' || config.protocol === 'wss',
      secret: config.token,
    };
    this.aria2 = new Aria2(options);
    this.protocol =
      config.protocol === 'ws' || config.protocol === 'wss' ? 'ws' : 'http';
  }

  async getJobs(): Promise<IJob[]> {
    try {
      const multiCallItems = [['tellActive'], ['tellWaiting', 0, 25]];
      const data = await this.multiCall(multiCallItems);
      return this.flatten(data);
    } catch (e) {
      console.error('Fail to get jobs', e);
    }
    return [];
  }

  async startJobs(...gid: string[]): Promise<void> {
    if (!gid.length) {
      return;
    }
    try {
      const multiCallItems = gid.map(o => ['unpause', o]);
      await this.multiCall(multiCallItems);
    } catch (e) {
      console.error('Start Jobs', e);
    }
  }

  async pauseJobs(...gid: string[]): Promise<void> {
    if (!gid.length) {
      return;
    }
    try {
      const multiCallItems = gid.map(o => ['pause', o]);
      await this.multiCall(multiCallItems);
    } catch (e) {
      console.error('Pause Jobs', e);
    }
  }

  async removeJobs(...gid: string[]): Promise<void> {
    if (!gid.length) {
      return;
    }
    try {
      const multiCallItems = gid.map(o => ['remove', o]);
      await this.multiCall(multiCallItems);
    } catch (e) {
      console.error('Remove Jobs', e);
    }
  }

  async getNumJobs(): Promise<number> {
    try {
      const data = await this.singleCall(() => this.aria2.call('tellActive'));
      return data.length;
    } catch (e) {
      console.error('Fail to get numJobs', e);
    }
    return 0;
  }

  async addUris(...uris: string[]): Promise<void> {
    if (!uris.length) {
      return;
    }
    try {
      const multiCallItems = uris.map(o => ['addUri', [o]]);
      await this.multiCall(multiCallItems);
      await client.notify(`Start downloading ${uris.length} files using Aria2`);
    } catch (e) {
      await client.notify(`Fail to add URIs. ${e}`);
    }
  }

  async addUri(
    link: string,
    filename?: string,
    options?: IDownload,
  ): Promise<void> {
    try {
      await this.singleCall(() =>
        this.aria2.call('addUri', [link], options || {}),
      );
      await client.notify(`Start downloading ${filename || ''} using Aria2`);
    } catch (e) {
      await client.notify(`Fail to add URI. ${e}`);
    }
  }

  private async singleCall(func: () => Promise<any>): Promise<any> {
    if (this.protocol === 'ws') {
      try {
        await this.aria2.open();
        return await func();
      } finally {
        await this.aria2.close();
      }
    }
    return await func();
  }

  private async multiCall(
    callItems: (string | number | string[])[][],
  ): Promise<any> {
    if (this.protocol === 'ws') {
      try {
        await this.aria2.open();
        return await this.aria2.multiCall(callItems);
      } finally {
        await this.aria2.close();
      }
    }
    return await this.aria2.multiCall(callItems);
  }

  private flatten(input: any[]): any[] {
    const stack = [...input];
    const res = [];
    while (stack.length) {
      // pop value from stack
      const next = stack.pop();
      if (Array.isArray(next)) {
        // push back array items, won't modify the original input
        stack.push(...next);
      } else {
        res.push(next);
      }
    }
    // reverse to restore input order
    return res.reverse();
  }
}
