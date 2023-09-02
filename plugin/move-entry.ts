import * as fs from 'fs';
import { resolve } from 'path';
import { PluginOption } from 'vite';

const outDir = resolve(__dirname, '..', 'build');

export default function moveEntryScript(): PluginOption {
  return {
    name: 'move-entry',
    writeBundle: {
      order: 'post',
      async handler() {
        if (!fs.existsSync(outDir)) {
          throw Error('Build directory not exists.');
        }
        const root = resolve(outDir, 'src');
        const paths = await fs.promises.readdir(root);

        for (const path of paths) {
          const srcPath = resolve(root, path, 'index.html');
          const fileName = path === 'main' ? 'index.html' : `${path}.html`;
          const dstPath = resolve(outDir, fileName);
          await fs.promises.rename(srcPath, dstPath);
        }

        await fs.promises.rm(root, {
          recursive: true,
          force: true,
        });
      },
    },
  };
}
