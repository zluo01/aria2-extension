import browser from 'webextension-polyfill';

const PREFIX = 'aria2-signal:';

function key(k: string): string {
  return PREFIX + k;
}

export async function cacheSet(k: string): Promise<void> {
  await browser.storage.session.set({ [key(k)]: true });
}

export async function cacheRemove(k: string): Promise<boolean> {
  const storageKey = key(k);
  const result = await browser.storage.session.get(storageKey);
  if (!(storageKey in result)) return false;
  await browser.storage.session.remove(storageKey);
  return true;
}
