import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [svelte()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@app': r('./src/application'),
      '@adapters': r('./src/adapters'),
      '@ui': r('./src/ui'),
    },
  },
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
