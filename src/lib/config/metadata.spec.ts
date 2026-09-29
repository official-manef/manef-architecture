import { expect, test } from 'vitest';
import {
	pageMetadata,
	siteOrigin,
	seoSettings,
	pageIndexable,
	robotsDocument,
	sitemapDocument
} from './metadata';
import { appConfig } from './app';

test('metadata uses explicit origins, route labels and one brand configuration', () => {
	expect(siteOrigin()).toBeUndefined();
	expect(siteOrigin('https://example.com/')).toBe('https://example.com');
	for (const unsafe of [
		'javascript:alert(1)',
		'https://user:secret@example.com',
		'https://example.com/path',
		'https://example.com/?x=1',
		'http://example.com'
	]) {
		expect(() => siteOrigin(unsafe)).toThrow();
	}
	expect(pageMetadata(undefined, '/').canonical).toBeUndefined();
	const meta = pageMetadata(
		{ title: 'Account', description: 'Your profile' },
		'/account',
		siteOrigin('https://example.com')
	);
	expect(meta).toMatchObject({
		title: `Account · ${appConfig.name}`,
		description: 'Your profile',
		canonical: 'https://example.com/account',
		image: 'https://example.com/brand/social-preview.png'
	});
});

test('SEO is opt-in and optional verification settings validate before rendering', () => {
	const preview = seoSettings({ PUBLIC_SITE_URL: 'https://preview.example' });
	expect(pageIndexable(preview, undefined)).toBe(false);
	expect(sitemapDocument(preview)).not.toContain('<url>');
	expect(robotsDocument(preview)).toContain('Allow: /');
	expect(robotsDocument(preview)).not.toContain('Sitemap:');
	const live = seoSettings({
		PUBLIC_SITE_URL: 'https://site.example',
		PUBLIC_SEO_INDEXABLE: 'true',
		PUBLIC_GOOGLE_SITE_VERIFICATION: 'abc_123',
		PUBLIC_BING_SITE_VERIFICATION: '123ABC',
		PUBLIC_TWITTER_SITE: '@example'
	});
	expect(live).toMatchObject({
		googleVerification: 'abc_123',
		bingVerification: '123ABC',
		twitterSite: '@example'
	});
	expect(pageIndexable(live, undefined)).toBe(true);
	expect(pageIndexable(live, { indexable: false })).toBe(false);
	expect(pageIndexable(live, undefined, 404)).toBe(false);
	expect(sitemapDocument(live)).toContain('<loc>https://site.example/</loc>');
	expect(sitemapDocument(live)).not.toContain('/apps/');
	expect(robotsDocument(live)).toContain('Sitemap: https://site.example/sitemap.xml');
	for (const env of [
		{ PUBLIC_SEO_INDEXABLE: 'true' },
		{ PUBLIC_SEO_INDEXABLE: 'yes' },
		{ PUBLIC_GOOGLE_SITE_VERIFICATION: '<meta name="google-site-verification" content="x">' },
		{ PUBLIC_BING_SITE_VERIFICATION: 'invalid token' },
		{ PUBLIC_TWITTER_SITE: 'https://x.com/example' }
	])
		expect(() => seoSettings(env)).toThrow();
});
