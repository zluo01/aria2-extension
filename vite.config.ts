import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig } from 'vite';

import bundleAria from './plugin/bundle-aria';
import cleanBuildScript from './plugin/clean-build';
import makeManifest from './plugin/make-manifest';
import moveEntryScript from './plugin/move-entry';

const root = resolve(__dirname, 'src');
const outDir = resolve(__dirname, 'build');
const publicDir = resolve(__dirname, 'public');

export default defineConfig({
  resolve: {
    alias: {
      '@src': root,
    },
  },
  plugins: [
    react(),
    cleanBuildScript(),
    moveEntryScript(),
    makeManifest(),
    bundleAria(),
  ],
  publicDir,
  build: {
    outDir,
    sourcemap: process.env.__DEV__ === 'true',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(root, 'main', 'index.html'),
        background: resolve(root, 'background', 'index.ts'),
      },
      output: {
        entryFileNames: chunk => `${chunk.name}/index.js`,
      },
    },
  },
});
