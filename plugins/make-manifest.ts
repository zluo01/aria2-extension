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
            ...manifestContent,
            background: {
              service_worker: (manifestContent.background as any).scripts[0],
              type: (manifestContent.background as any).type,
            },
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
