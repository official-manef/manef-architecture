import { Linter } from 'eslint';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { sliceBoundary } from '../../../scripts/eslint-boundaries.mjs';

test('slice boundaries allow barrels and same-slice code but reject alternate deep imports', () => {
	const lint = (source: string, filename: string) =>
		new Linter().verify(
			source,
			{
				plugins: { starter: { rules: { boundary: sliceBoundary } } },
				rules: { 'starter/boundary': 'error' }
			},
			{ filename: resolve(filename) }
		);
	for (const source of [
		"import x from '$features/dashboard/components/private';",
		"export {x} from '../dashboard/components/private';",
		"import('../dashboard/components/private');"
	]) {
		expect(
			lint(source, 'slices/settings/check.js').some((item) => item.ruleId === 'starter/boundary')
		).toBe(true);
	}
	expect(lint("import x from '$features/dashboard';", 'slices/settings/check.js')).toEqual([]);
	expect(lint("import x from './components/private';", 'slices/settings/check.js')).toEqual([]);
	expect(
		lint("import x from '../../slices/dashboard/components/private';", 'src/routes/check.js').some(
			(item) => item.ruleId === 'starter/boundary'
		)
	).toBe(true);
});
