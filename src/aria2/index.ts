import { IDownload, IJob } from '../types';
import { Notify } from '../browser';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Aria2 = require('aria2');

const aria2 = new Aria2();

export async function GetJobs(): Promise<IJob[]> {
  const multiCall = [['tellActive'], ['tellWaiting', 0, 25]];

  return flatten(await aria2.multicall(multiCall));
}

export function StartJob(gid: string): Promise<string[]> {
  return aria2.call('unpause', gid);
}

export async function StartJobs(gid: string[]): Promise<void> {
  const multiCall = gid.map(o => ['unpause', o]);

  await aria2.multicall(multiCall);
}

export async function PauseJob(gid: string): Promise<void> {
  await aria2.call('pause', gid);
}

export async function PauseJobs(gid: string[]): Promise<void> {
  const multiCall = gid.map(o => ['pause', o]);

  await aria2.multicall(multiCall);
}

export async function RemoveJobs(gid: string[]): Promise<void> {
  const multiCall = gid.map(o => ['remove', o]);

  await aria2.multicall(multiCall);
}

export async function GetNumJobs(): Promise<number> {
  const data = await aria2.call('tellActive');
  return data.length;
}

export function AddUri(
  link: string,
  fileName?: string,
  options?: IDownload
): void {
  aria2
    .call('addUri', [link], options || {})
    .then(() => Notify(`Start downloading ${fileName || ''} using Aria2`))
    .catch(() => {
      setTimeout(() => {
        aria2
          .call('addUri', [link], options || {})
          .then(() => Notify(`Start downloading ${fileName || ''} using Aria2`))
          .catch((err: any) => Notify(err.message || err));
      }, 3000);
    });
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
