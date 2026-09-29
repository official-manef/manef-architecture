import { v } from 'convex/values';
import { query } from './_generated/server';
import manifest from '../../version.json';

// Public by design: this returns build metadata only, never user data.
export const status = query({
	args: {},
	returns: v.object({ ok: v.literal(true), stack: v.string(), version: v.string() }),
	handler: async () => ({
		ok: true as const,
		stack: 'Svelte 5 Runes + Bun + Convex',
		version: manifest.version
	})
});
