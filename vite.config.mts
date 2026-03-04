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
  define: {
    __TARGET__: JSON.stringify(process.env.TARGET ?? 'FIREFOX'),
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
    sourcemap: mode === 'dev',
    minify: mode !== 'dev',
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
