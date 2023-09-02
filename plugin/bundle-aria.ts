import * as fs from 'fs';
import { resolve } from 'path';
import { PluginOption } from 'vite';

const ariaDir = resolve(__dirname, '..', 'AriaNg');
const outDir = resolve(__dirname, '..', 'build');

export default function bundleAria(): PluginOption {
  return {
    name: 'bundle-aria',
    writeBundle: {
      order: 'post',
      async handler() {
        if (!fs.existsSync(outDir)) {
          throw Error('Build directory not exists.');
        }

        const outputDir = resolve(__dirname, '..', 'build', 'manager');
        await fs.promises.cp(ariaDir, outputDir, {
          recursive: true,
        });
      },
    },
  };
}
