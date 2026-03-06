import { Aria2Connector, createConnector } from '@/lib/aria2c/connector';
import { Aria2ClientType } from '@/lib/aria2c/types';
import { client } from '@/lib/browser';
import { IConfig, IDownload, IJob } from '@/types';

export class Aria2Client {
  private readonly config: IConfig;
  private readonly connector: Aria2Connector;

  constructor(config: IConfig) {
    const protocol: Aria2ClientType =
      config.protocol === 'ws' || config.protocol === 'wss' ? 'ws' : 'http';
    const secure = config.protocol === 'https' || config.protocol === 'wss';

    this.config = config;
    this.connector = createConnector(
      protocol,
      config.host,
      config.port,
      secure,
      config.path,
    );
  }

  close(): void {
    this.connector.close();
  }

  shouldReset(config: IConfig): boolean {
    return (
      this.config.path !== config.path ||
      this.config.protocol !== config.protocol ||
      this.config.host !== config.host ||
      this.config.port !== config.port ||
      this.config.token !== config.token
    );
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
      const data = await this.call('tellActive');
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
      await this.call('addUri', [link], options || {});
      await client.notify(`Start downloading ${filename || ''} using Aria2`);
    } catch (e) {
      await client.notify(`Fail to add URI. ${e}`);
    }
  }

  /**
   * Call an aria2 method
   */
  private async call(method: string, ...params: any[]): Promise<any> {
    const methodName = this.buildMethodName(method);
    const requestParams = this.config.token
      ? [`token:${this.config.token}`, ...params]
      : params;

    return this.connector.request(methodName, requestParams);
  }

  /**
   * Execute multiple calls in a single request
   */
  private async multiCall(
    calls: (string | number | string[])[][],
  ): Promise<any[]> {
    const multiCallParams = calls.map(call => {
      const [method, ...params] = call;
      return {
        methodName: this.buildMethodName(method as string),
        params: this.config.token
          ? [`token:${this.config.token}`, ...params]
          : params,
      };
    });

    const results = await this.call('system.multicall', multiCallParams);

    // Check for errors in results
    return results.map((result: any[], index: number) => {
      if (result.length === 0) {
        throw new Error(`Call ${index} failed: empty result`);
      }
      if (
        result[0] &&
        typeof result[0] === 'object' &&
        'faultString' in result[0]
      ) {
        throw new Error(result[0].faultString);
      }
      return result[0];
    });
  }

  /**
   * Execute batch calls (returns array of promises)
   */
  async batch(
    calls: (string | number | string[])[][],
  ): Promise<Promise<any>[]> {
    return calls.map(call => {
      const [method, ...params] = call;
      return this.call(method as string, ...params);
    });
  }

  /**
   * List available notifications
   */
  async listNotifications(): Promise<string[]> {
    const notifications = await this.call('system.listNotifications');
    return notifications.map((notification: string) =>
      notification.startsWith('aria2.') ? notification.slice(6) : notification,
    );
  }

  /**
   * List available methods
   */
  async listMethods(): Promise<string[]> {
    const methods = await this.call('system.listMethods');
    return methods.map((method: string) =>
      method.startsWith('aria2.') ? method.slice(6) : method,
    );
  }

  /**
   * Build full method name with aria2 prefix if needed
   */
  private buildMethodName(method: string): string {
    if (method.startsWith('system.')) {
      return method;
    }
    if (!method.startsWith('aria2.')) {
      return `aria2.${method}`;
    }
    return method;
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
