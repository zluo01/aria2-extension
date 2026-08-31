import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

import bundleAria from './plugins/bundle-aria.ts';
import cleanBuildScript from './plugins/clean-build.ts';
import makeManifest from './plugins/make-manifest.ts';
import moveEntryScript from './plugins/move-entry.ts';

const root = resolve(import.meta.dirname, 'src');
const outDir = resolve(import.meta.dirname, 'build');
const publicDir = resolve(import.meta.dirname, 'public');

export default defineConfig(({ mode }) => ({
  define: {
    __TARGET__: JSON.stringify(process.env.TARGET ?? 'FIREFOX'),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    cleanBuildScript(),
    moveEntryScript(),
    makeManifest(),
    bundleAria(),
  ],
  test: {},
  publicDir,
  build: {
    outDir,
    sourcemap: mode === 'dev',
    minify: mode !== 'dev',
    emptyOutDir: false,
    rolldownOptions: {
      input: {
        main: resolve(root, 'main', 'index.html'),
        download: resolve(root, 'download', 'index.html'),
        setting: resolve(root, 'setting', 'index.html'),
        background: resolve(root, 'background', 'index.ts'),
      },
      output: {
        entryFileNames: chunk => `${chunk.name}/index.js`,
      },
    },
  },
}));
