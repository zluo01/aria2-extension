import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import bundleAria from './plugins/bundle-aria';
import cleanBuildScript from './plugins/clean-build';
import makeManifest from './plugins/make-manifest';
import moveEntryScript from './plugins/move-entry';

const root = resolve(__dirname, 'src');
const outDir = resolve(__dirname, 'build');
const publicDir = resolve(__dirname, 'public');

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': root,
    },
  },
  define: {
    'process.env.__DEV__': JSON.stringify(mode === 'dev'),
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
    cleanBuildScript(),
    moveEntryScript(),
    makeManifest(),
    bundleAria(),
  ],
  publicDir,
  build: {
    outDir,
    sourcemap: process.env.__DEV__ === 'true',
    minify: process.env.__DEV__ === 'false',
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
}));
