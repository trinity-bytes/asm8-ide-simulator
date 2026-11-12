import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// The dev machine has little RAM: keep the worker pool small.
export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: { conditions: ['browser'] },
    test: {
      include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
      environment: 'node',
      pool: 'forks',
      maxWorkers: 2,
      fileParallelism: true,
    },
  }),
);
