import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/routes/layout.css', 'utf8');
const shell = readFileSync('slices/app-shell/components/app-shell.svelte', 'utf8');
const snap = readFileSync('src/lib/components/app-ui/viewport-snap-section.svelte', 'utf8');
const segmented = readFileSync('src/lib/components/app-ui/segmented-control.svelte', 'utf8');

describe('dynamic app UI contract', () => {
	it('uses content-aware grids and overflow-aware snap rails', () => {
		expect(css).toContain('repeat(auto-fit, minmax(min(100%, var(--app-feature-grid-min)), 1fr))');
		expect(css).toContain('scroll-snap-type: x mandatory');
		expect(css).toContain('scroll-snap-type: y proximity');
		expect(css).toContain(".app-feature-grid[data-density='compact']");
		expect(css).toContain(".app-horizontal-rail[data-desktop-grid='true']");
	});

	it('keeps the breadcrumb semantic and workspace switching outside it', () => {
		const start = shell.indexOf('<nav aria-label="Feature breadcrumb"');
		const end = shell.indexOf('</nav>', start);
		const breadcrumb = shell.slice(start, end);
		expect(start).toBeGreaterThan(-1);
		expect(breadcrumb).not.toContain('<button');
		expect(breadcrumb).not.toContain('<select');
		expect(breadcrumb).not.toContain('DropdownMenu');
		expect(shell.slice(end)).toContain('<DropdownMenu.Trigger');
		expect(shell).toContain('class="app-mobile-dock');
		expect(shell).not.toContain('grid-cols-3 border-t');
	});

	it('measures viewport snap and keeps local modes Svelte 5 native', () => {
		expect(snap).toContain('ResizeObserver');
		expect(snap).toContain('height >= viewport * 0.88');
		expect(snap).toContain('$effect');
		expect(segmented).toContain('$bindable');
		expect(segmented).toContain('aria-pressed={value === item.id}');
		expect(segmented).toContain('onclick={() => select(item.id)}');
	});
});
