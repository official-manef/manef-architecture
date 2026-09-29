import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

test('version command syncs metadata and rejects invalid input without writing', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'starter-version-'));
	const script = resolve('scripts/version.mjs');
	const run = (arg: string) =>
		execFileSync(process.execPath, [script, arg], { cwd, stdio: 'pipe' });
	try {
		writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version: '0.2.0', private: true }));
		writeFileSync(
			join(cwd, 'version.json'),
			JSON.stringify({ version: '0.2.0', channel: 'stable' })
		);
		run('0.3.0');
		const pkg = readFileSync(join(cwd, 'package.json'), 'utf8');
		expect(JSON.parse(pkg)).toEqual({ version: '0.3.0', private: true });
		expect(JSON.parse(readFileSync(join(cwd, 'version.json'), 'utf8'))).toEqual({
			version: '0.3.0',
			channel: 'stable'
		});
		expect(run('--check').toString()).toContain('v0.3.0');
		expect(() => run('v1.0')).toThrow();
		expect(readFileSync(join(cwd, 'package.json'), 'utf8')).toBe(pkg);
		writeFileSync(join(cwd, 'version.json'), JSON.stringify({ version: '0.1.0' }));
		expect(() => run('--check')).toThrow();
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
