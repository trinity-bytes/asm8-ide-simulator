import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config(
  { ignores: ['legacy/', 'dist/', 'node_modules/', 'dev-dist/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, svelteConfig } },
  },
  {
    // The core is framework- and browser-free (hexagonal architecture).
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'svelte',
            'svelte/*',
            '@app/*',
            '@adapters/*',
            '@ui/*',
            '../application/*',
            '../adapters/*',
            '../ui/*',
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@adapters/*', '@ui/*', '../adapters/*', '../ui/*'] }],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // State containers replace collections immutably ($state.raw) and local Sets/Maps inside
      // functions are temporaries; SvelteSet/SvelteMap would add reactivity nobody reads.
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
);
