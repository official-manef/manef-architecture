import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(readFileSync('version.json', 'utf8'));
const version = process.argv[2];
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

if (version === '--check') {
	assert.match(manifest.version, stableVersion, 'Use a stable MAJOR.MINOR.PATCH version.');
	assert.equal(
		pkg.version,
		manifest.version,
		'Run bun run version:bump <version> to sync metadata.'
	);
	console.log(`Template metadata matches v${manifest.version}.`);
} else {
	assert.match(version ?? '', stableVersion, 'Usage: bun run version:bump <MAJOR.MINOR.PATCH>');
	manifest.version = pkg.version = version;
	for (const [path, data] of [
		['package.json', pkg],
		['version.json', manifest]
	]) {
		writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	}
	console.log(`Updated to v${version}. Update CHANGELOG.md, then run bun run verify.`);
}
