import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';
import fs from 'node:fs';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'offscreen'),
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  worker: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  plugins: [
    {
      name: 'copy-wasm-to-root',
      closeBundle() {
        const distDir = resolve(rootDir, '../../dist/offscreen');
        const assetsDir = resolve(distDir, 'assets');
        if (fs.existsSync(assetsDir)) {
          fs.readdirSync(assetsDir).forEach(file => {
            if (file.endsWith('.wasm')) {
              fs.copyFileSync(resolve(assetsDir, file), resolve(distDir, file));
            }
          });
        }
      }
    }
  ]
});
