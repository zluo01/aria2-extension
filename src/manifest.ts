import type { Manifest } from 'webextension-polyfill';

import pkg from '../package.json';

const manifest: Manifest.WebExtensionManifest = {
  manifest_version: 2,
  name: 'Aria2 Integration Extension',
  version: pkg.version,
  icons: {
    '48': 'logo48.png',
    '128': 'logo128.png',
  },
  permissions: [
    'tabs',
    'contextMenus',
    'notifications',
    'storage',
    'downloads',
    'webRequest',
    'webRequestBlocking',
    '<all_urls>',
  ],
  content_security_policy:
    "script-src 'self' 'unsafe-eval'; object-src 'self';",
  background: {
    scripts: ['background/index.js'],
    type: 'module',
  },
  commands: {
    open_detail: {
      description: 'Open AriaNg',
    },
  },
  browser_action: {
    default_popup: 'index.html',
    default_title: 'Aria2Ex',
  },
  options_ui: {
    page: 'index.html#/setting',
    open_in_tab: true,
  },
};

export default manifest;
