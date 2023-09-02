import * as fs from 'fs';
import { resolve } from 'path';
import { PluginOption } from 'vite';

const outDir = resolve(__dirname, '..', 'build');

export default function cleanBuildScript(): PluginOption {
  return {
    name: 'clean-build',
    buildStart: {
      async handler() {
        if (fs.existsSync(outDir)) {
          await fs.promises.rm(outDir, {
            recursive: true,
            force: true,
          });
          console.info('Cleanup build folder.');
          return;
        }
        console.info('No build folder.');
      },
    },
  };
}
