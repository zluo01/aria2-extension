import * as fs from 'fs';
import * as path from 'path';
import { PluginOption } from 'vite';

import manifest from '../src/manifest';

const { resolve } = path;

const outDir = resolve(__dirname, '..', 'build');

export default function makeManifest(): PluginOption {
  return {
    name: 'make-manifest',
    writeBundle: {
      order: 'post',
      async handler() {
        if (!fs.existsSync(outDir)) {
          throw Error('Build directory not exists.');
        }

        let manifestContent = manifest;

        if (process.env.TARGET === 'CHROME') {
          manifestContent = {
            manifest_version: 2,
            name: manifestContent.name,
            version: manifestContent.version,
            icons: manifestContent.icons,
            permissions: [
              ...(manifestContent.permissions as string[]),
              '<all_urls>',
            ],
            content_security_policy: "script-src 'self'; object-src 'self';",
            background: {
              page: 'background-page.html',
            },
            commands: manifestContent.commands,
            options_ui: manifestContent.options_ui,
            browser_action: manifestContent.action,
          };
        }

        const manifestPath = resolve(outDir, 'manifest.json');
        await fs.promises.writeFile(
          manifestPath,
          JSON.stringify(manifestContent, null, 2),
        );

        console.info(`Manifest file copy complete: ${manifestPath}`);
      },
    },
  };
}
