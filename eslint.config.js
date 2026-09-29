import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import convex from '@convex-dev/eslint-plugin';
import { runtimeBoundary, sliceBoundary } from './scripts/eslint-boundaries.mjs';
import { noConvexCollect } from './scripts/eslint-convex.mjs';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['src/convex/_generated/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		linterOptions: { reportUnusedDisableDirectives: 'error' },
		plugins: {
			starter: {
				rules: {
					'slice-boundaries': sliceBoundary,
					'runtime-boundaries': runtimeBoundary,
					'no-convex-collect': noConvexCollect
				}
			}
		},
		rules: {
			'starter/slice-boundaries': 'error',
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: [
			'src/**/*.{ts,svelte}',
			'slices/**/*.{ts,svelte}',
			'scripts/**/*.ts',
			'assets.config.ts',
			'vite.config.ts'
		],
		ignores: ['**/*.d.ts', 'src/lib/components/ui/**'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		},
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/prefer-promise-reject-errors': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error'
		}
	},
	{
		files: ['src/convex/**/*.ts'],
		ignores: ['**/*.{test,spec}.ts', '**/*.d.ts'],
		plugins: { '@convex-dev': convex },
		rules: {
			'@convex-dev/no-old-registered-function-syntax': 'error',
			'@convex-dev/require-args-validator': 'error',
			'@convex-dev/explicit-table-ids': 'error',
			'@convex-dev/no-filter-in-query': 'error',
			'starter/no-convex-collect': 'error',
			'@convex-dev/no-schema-import-cycle': 'error'
		}
	},
	{
		files: ['src/**/*.{js,ts,svelte}', 'slices/**/*.{js,ts,svelte}'],
		ignores: ['**/*.{test,spec}.{js,ts}', '**/*.d.ts'],
		rules: { 'starter/runtime-boundaries': 'error' }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		files: ['**/*.svelte'],
		rules: {
			'svelte/no-at-html-tags': 'error',
			// A boundary's failed(_error, reset) snippet needs its unused first argument.
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		files: ['src/lib/components/ui/**/*.svelte'],
		rules: {
			// Generated shadcn primitives intentionally accept external href values.
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
