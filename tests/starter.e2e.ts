import { expect, test } from '@playwright/test';
import { assets, assetMimeType } from '../assets.config';
import { appConfig } from '../src/lib/config/app';

test('optional features explain setup and expose no credentials in a clean clone', async ({
	page,
	request
}) => {
	await page.goto('/apps/notes');
	await expect(page.getByText('Sign-in is not configured.', { exact: false })).toBeVisible();
	const response = await request.get('/api/ai/config');
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('no-store');
	expect(response.headers()['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
	expect(await response.json()).toEqual({
		ai: { enabled: false, providers: [] },
		mcp: { enabled: false, servers: [] }
	});
	expect((await request.get('/auth/login')).status()).toBe(404);
	expect((await request.post('/api/mcp/server', { data: {} })).status()).toBe(404);
	expect((await request.post('/api/mcp/tools', { data: {} })).status()).toBe(404);
	expect((await request.post('/api/ai/chat', { data: {} })).status()).toBe(404);
	await page.goto('/apps/assistant');
	await expect(page.getByRole('heading', { name: 'Assistant', exact: true })).toBeVisible();
	await expect(page.getByText('AI chat is disabled', { exact: false })).toBeVisible();
});

test('navigation loads feature code on demand and announces the pending screen', async ({
	page
}, testInfo) => {
	await page.goto('/apps/dashboard');
	await expect(page.getByRole('button', { name: 'Interaction kit' })).toBeEnabled();
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	let requested = 0;
	await page.route('**/_app/immutable/chunks/*.js', async (route) => {
		requested++;
		await gate;
		await route.continue();
	});
	const nav = page.getByRole('navigation', {
		name: testInfo.project.name === 'desktop' ? 'Apps' : 'Mobile app dock'
	});
	try {
		const navigation = nav.getByRole('link', { name: 'Assistant', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Loading Assistant');
		expect(requested).toBeGreaterThan(0);
		release();
		await navigation;
		await expect(page.getByRole('heading', { name: 'Assistant', exact: true })).toBeVisible();
	} finally {
		release();
		await page.unrouteAll({ behavior: 'wait' });
	}
});

test('branding, sharing metadata and asset files agree across navigation', async ({
	page,
	request
}) => {
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('lang', appConfig.locale);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://architecture.manef.dev/'
	);
	await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
		'type',
		assetMimeType(assets.favicon.path)
	);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		'content',
		`https://architecture.manef.dev${assets.socialImage.path}`
	);
	for (const asset of Object.values(assets)) {
		const response = await request.get(asset.path);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain(assetMimeType(asset.path));
	}
	const manifest = await (await request.get('/site.webmanifest')).json();
	expect(manifest.name).toBe(appConfig.name);
	await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
		'content',
		'google-test-token'
	);
	await expect(page.locator('meta[name="msvalidate.01"]')).toHaveAttribute(
		'content',
		'BING_TEST_TOKEN'
	);
	await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute('content', '@manef_test');
	const robots = await request.get('/robots.txt');
	expect(robots.status()).toBe(200);
	expect(await robots.text()).toContain('Sitemap: https://architecture.manef.dev/sitemap.xml');
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.headers()['content-type']).toContain('application/xml');
	expect(await sitemap.text()).toContain('<loc>https://architecture.manef.dev/</loc>');
	expect(await sitemap.text()).not.toContain('/apps/');
	expect(manifest.icons[0]).toMatchObject({
		src: assets.appIcon.path,
		sizes: `${assets.appIcon.width}x${assets.appIcon.height}`
	});
	await expect(page).toHaveTitle(appConfig.name);
	await expect(
		page.getByRole('application', { name: 'MANEF architecture graph canvas' })
	).toBeVisible();
	const graphMode = page.getByRole('button', { name: 'Graph', exact: true });
	await graphMode.click();
	await expect(graphMode).toHaveAttribute('aria-pressed', 'true');
});

test('fresh clone boots, opens live-data and preserves keyboard navigation', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('response', (response) => {
		if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
	});
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(appConfig.name);
	await expect(page.getByRole('heading', { level: 1, name: appConfig.name })).toBeVisible();
	expect(response?.headers()['x-content-type-options']).toBe('nosniff');
	const graphMode = page.getByRole('button', { name: 'Graph', exact: true });
	await expect(graphMode).toBeEnabled();
	await graphMode.press('Enter');
	await expect(graphMode).toHaveAttribute('aria-pressed', 'true');
	await page.goto('/apps/live-data');
	await expect(page.getByText('Convex is ready to link')).toBeVisible();
	await expect(page).toHaveTitle(`Live data · ${appConfig.name}`);
	await page.getByRole('button', { name: 'Switch workspace: Starter workspace' }).click();
	await expect(page.getByRole('menu')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toBeHidden();
	await expect(
		page.getByRole('button', { name: 'Switch workspace: Starter workspace' })
	).toBeFocused();
	expect(errors).toEqual([]);
});

test('client controls wait for hydration', async ({ page }) => {
	let resumeScripts!: () => void;
	const scriptsReady = new Promise<void>((resolve) => (resumeScripts = resolve));
	await page.route('**/*', async (route) => {
		if (route.request().resourceType() === 'script') await scriptsReady;
		await route.continue();
	});
	try {
		await page.goto('/apps/settings', { waitUntil: 'commit' });
		const menu = page.getByRole('button', { name: 'Switch workspace: Starter workspace' });
		const mode = page.getByRole('button', { name: 'Interface', exact: true });
		await expect(menu).toBeDisabled();
		await expect(mode).toBeDisabled();
		await page.getByLabel('Workspace name').fill('Typed before hydration');
		await page.getByText('Advanced template rules', { exact: true }).click();
		await expect(page.locator('details')).toHaveAttribute('open', '');
		resumeScripts();
		await expect(menu).toBeEnabled();
		await expect(page.getByLabel('Workspace name')).toHaveValue('Typed before hydration');
		await expect(page.getByText('Typed before hydration', { exact: true })).toBeVisible();
		await expect(page.locator('details')).toHaveAttribute('open', '');
		await mode.click();
		await expect(mode).toHaveAttribute('aria-pressed', 'true');
		await menu.click();
		await expect(page.getByRole('menu')).toBeVisible();
	} finally {
		resumeScripts();
	}
});

test('dynamic app shell stays responsive and semantic', async ({ page }, testInfo) => {
	await page.goto('/apps/dashboard');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

	const geometry = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(geometry.scrollWidth).toBe(geometry.clientWidth);

	const breadcrumb = page.getByRole('navigation', { name: 'Feature breadcrumb' });
	await expect(breadcrumb).toBeVisible();
	expect(await breadcrumb.locator('button, select').count()).toBe(0);
	await expect(page.getByRole('button', { name: /Switch workspace:/ })).toBeVisible();

	const stackRail = page.getByRole('region', { name: 'Stack versions' });
	await expect(stackRail).toBeVisible();
	const rail = await stackRail.evaluate((node) => ({
		client: node.clientWidth,
		scroll: node.scrollWidth
	}));

	if (testInfo.project.name !== 'desktop') {
		await expect(page.getByRole('navigation', { name: 'Mobile app dock' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Apps' })).toBeHidden();
		expect(rail.scroll).toBeGreaterThan(rail.client);
	} else {
		await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Mobile app dock' })).toBeHidden();
		expect(rail.scroll).toBeLessThanOrEqual(rail.client + 1);
	}

	await page.getByRole('button', { name: 'Interaction kit' }).click();
	await expect(page.getByText('Adaptive grid', { exact: true })).toBeVisible();
	const interactionGrid = page.locator('.app-feature-grid').first();
	const columns = await interactionGrid.evaluate(
		(node) => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length
	);
	if (testInfo.project.name !== 'desktop') expect(columns).toBe(1);
	else expect(columns).toBeGreaterThan(1);
});

test('workspace utility is separate from breadcrumb state', async ({ page }) => {
	await page.goto('/apps/dashboard');
	await page.getByRole('button', { name: 'Switch workspace: Starter workspace' }).click();
	await page.getByRole('menuitem', { name: 'Preview workspace' }).click();
	await expect(page.getByRole('navigation', { name: 'Feature breadcrumb' })).toContainText(
		'Preview workspace'
	);
	await expect(
		page.getByRole('button', { name: 'Switch workspace: Preview workspace' })
	).toBeVisible();
});

test('settings use local modes and progressive disclosure', async ({ page }) => {
	await page.goto('/apps/settings');
	await page.getByRole('button', { name: 'Interface' }).click();
	await expect(page.getByText('App-first mobile', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Workspace', exact: true }).click();
	await page.getByText('Advanced template rules').click();
	await expect(page.getByText(/Keep user customization in data\/config/)).toBeVisible();
});

test('invalid registry slug is a real 404', async ({ page }) => {
	const response = await page.goto('/apps/not-real');
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'App not found' })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});
