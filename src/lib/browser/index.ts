import { ChromeClient } from './chrome';
import { FirefoxClient } from './firefox';
import { BrowserClient } from './types';

declare const __TARGET__: string;

export const client: BrowserClient =
  __TARGET__ === 'CHROME' ? new ChromeClient() : new FirefoxClient();
