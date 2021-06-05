import { getConfiguration, notify } from '../browser';
import { DEFAULT_CONFIG, IConfig, IDownload, IJob } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Aria2 = require('aria2');

type Aria2ClientType = string;

const Aria2WsClient: Aria2ClientType = 'ws';
const Aria2HttpClient: Aria2ClientType = 'http';

let aria2: any;
let prevConfig: IConfig = DEFAULT_CONFIG;

export async function ConstructAria2Instance(): Promise<Aria2ClientType> {
  const config: IConfig = await getConfiguration();
  if (!aria2 || JSON.stringify(prevConfig) === JSON.stringify(config)) {
    const options = {
      path: '/jsonrpc',
      host: config.host,
      port: config.port,
      secure: config.protocol === 'https' || config.protocol === 'wss',
      secret: config.token,
    };
    prevConfig = config;
    aria2 = new Aria2(options);
  }

  if (config.protocol === 'ws' || config.protocol === 'wss') {
    return Aria2WsClient;
  }
  return Aria2HttpClient;
}

export async function GetJobs(): Promise<IJob[]> {
  const multiCallItems = [['tellActive'], ['tellWaiting', 0, 25]];
  const data = await multiCall(multiCallItems);
  return flatten(data);
}

export async function StartJobs(...gid: string[]): Promise<void> {
  if (!gid.length) {
    return;
  }
  try {
    const multiCallItems = gid.map(o => ['unpause', o]);
    await multiCall(multiCallItems);
  } catch (e) {
    console.error(e);
  }
}

export async function PauseJobs(...gid: string[]): Promise<void> {
  if (!gid.length) {
    return;
  }
  try {
    const multiCallItems = gid.map(o => ['pause', o]);
    await multiCall(multiCallItems);
  } catch (e) {
    console.error(e);
  }
}

export async function RemoveJobs(...gid: string[]): Promise<void> {
  if (!gid.length) {
    return;
  }
  try {
    const multiCallItems = gid.map(o => ['remove', o]);
    await multiCall(multiCallItems);
  } catch (e) {
    console.error(e);
  }
}

export async function GetNumJobs(): Promise<number> {
  const data = await singleCall(() => aria2.call('tellActive'));
  return data.length;
}

export async function AddUris(...uris: string[]): Promise<void> {
  if (!uris.length) {
    return;
  }
  try {
    const multiCallItems = uris.map(o => ['addUri', o]);
    await multiCall(multiCallItems);
    await notify(`Start downloading ${uris.length} files using Aria2`);
  } catch (e) {
    await notify(e.message || e);
  }
}

export async function AddUri(
  link: string,
  fileName?: string,
  options?: IDownload
): Promise<void> {
  try {
    await singleCall(() => aria2.call('addUri', [link], options || {}));
    await notify(`Start downloading ${fileName || ''} using Aria2`);
  } catch (e) {
    await notify(e.message || e);
  }
}

function flatten(input: any[]): any[] {
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

async function singleCall(func: () => Promise<any>): Promise<any> {
  const instanceType: Aria2ClientType = await ConstructAria2Instance();
  const useWebSocket = instanceType === Aria2WsClient;
  if (useWebSocket) {
    await aria2.open();
  }
  const data = await func();
  if (useWebSocket) {
    await aria2.close();
  }
  return data;
}

async function multiCall(callItems: (string | number)[][]): Promise<any> {
  const instanceType: Aria2ClientType = await ConstructAria2Instance();
  const useWebSocket = instanceType === Aria2WsClient;
  if (useWebSocket) {
    await aria2.open();
  }
  const data = await aria2.multicall(callItems);
  if (useWebSocket) {
    await aria2.close();
  }
  return data;
}
