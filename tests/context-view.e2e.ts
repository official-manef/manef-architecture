import { expect, test } from '@playwright/test';

test('portable views restore graph and filters with arbitrary tag namespaces', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const graph = {
		schemaVersion: 1,
		nodes: [
			{
				id: 'shared',
				label: 'Shared context',
				tags: ['__proto__:safe', 'constructor:safe'],
				inputs: [],
				outputs: []
			}
		],
		edges: []
	};
	const params = new URLSearchParams({
		graph: JSON.stringify(graph),
		mode: 'graph',
		q: 'Shared context'
	});
	await page.goto(`/app?${params}`);
	await expect(page.getByRole('button', { name: 'Graph', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByRole('textbox', { name: 'Search graph' })).toHaveValue('Shared context');
	await expect(
		page.getByRole('application', { name: 'MANEF architecture graph canvas' })
	).toContainText('Shared context');
	await expect(page.getByRole('button', { name: 'Share view', exact: true })).toBeEnabled();
	expect(errors).toEqual([]);
});

test('malformed shared graphs leave a usable default canvas', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/app?graph=invalid-json');
	await expect(page.getByRole('button', { name: 'Graph', exact: true })).toBeEnabled();
	await expect(
		page.getByRole('application', { name: 'MANEF architecture graph canvas' })
	).toBeVisible();
	await expect(
		page.getByText('This shared graph link is invalid or too large. The default graph is shown.')
	).toBeVisible();
	expect(errors).toEqual([]);
});
