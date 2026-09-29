import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// SvelteKit merges its own allowlist; root feature slices also need client dev access.
	server: { fs: { allow: ['slices'] } },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'slices/**/*.{test,spec}.{js,ts}'],
					exclude: ['**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
