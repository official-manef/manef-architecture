import { describe, expect, it } from 'vitest';
import { APP_REGISTRY, getApp, isAppSlug } from './registry';

describe('app registry SSOT', () => {
	it('keeps slugs unique and drives dynamic-page lookup', () => {
		const slugs = APP_REGISTRY.map((item) => item.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(isAppSlug('dashboard')).toBe(true);
		expect(isAppSlug('does-not-exist')).toBe(false);
		expect(getApp('settings')?.label).toBe('Settings');
	});

	it('keeps every page definition complete', () => {
		for (const item of APP_REGISTRY) {
			expect(item.label.length).toBeGreaterThan(0);
			expect(item.description.length).toBeGreaterThan(0);
			expect(item.loadScreen).toBeTypeOf('function');
		}
	});
});
