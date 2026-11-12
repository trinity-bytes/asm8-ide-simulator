import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [svelte()],
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
