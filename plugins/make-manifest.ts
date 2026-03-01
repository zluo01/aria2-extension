import * as fs from 'fs';
import * as path from 'path';
import { PluginOption } from 'vite';

import { Chrome, Firefox } from '../src/manifest';

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

        const manifest = process.env.TARGET === 'CHROME' ? Chrome : Firefox;

        const manifestPath = resolve(outDir, 'manifest.json');
        await fs.promises.writeFile(
          manifestPath,
          JSON.stringify(manifest, null, 2),
        );

        console.info(`Manifest file copy complete: ${manifestPath}`);
      },
    },
  };
}
