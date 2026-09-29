import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const key = process.env.CONVEX_DEPLOY_KEY;
assert(key, 'Set CONVEX_DEPLOY_KEY in the hosting environment before deploying.');
assert(
	process.env.VERCEL_ENV !== 'preview' || key.startsWith('preview:'),
	'Preview builds require a preview deploy key; refusing to touch another backend.'
);
assert(
	process.env.VERCEL_ENV !== 'production' || key.startsWith('prod:'),
	'Production builds require a production deploy key.'
);

const commands = [
	['run', 'verify'],
	[
		'x',
		'--no-install',
		'convex',
		'deploy',
		'--cmd',
		'bun run build',
		'--cmd-url-env-var-name',
		'PUBLIC_CONVEX_URL'
	]
];
for (const args of commands) {
	if (process.argv.includes('--dry-run')) console.log(`bun ${args.join(' ')}`);
	else {
		const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}
