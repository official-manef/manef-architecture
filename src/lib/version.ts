import pkg from '../../package.json';
import manifest from '../../version.json';

export const templateVersion = manifest.version;
export const bunVersion = pkg.packageManager.slice('bun@'.length);
export const stackVersions = [
	{ label: 'Svelte', value: pkg.devDependencies.svelte, hint: 'Runes mode' },
	{ label: 'SvelteKit', value: pkg.devDependencies['@sveltejs/kit'], hint: 'Server rendering' },
	{ label: 'Convex', value: pkg.dependencies.convex, hint: 'Optional until linked' },
	{ label: 'Bun', value: bunVersion, hint: 'Package manager' }
] as const;
