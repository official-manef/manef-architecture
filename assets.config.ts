// Public asset contract. Set status to 'custom' before replacing a placeholder.
type Asset = {
	path: `/brand/${string}`;
	width: number;
	height: number;
	status: 'placeholder' | 'custom';
	prompt: string;
};

export const assetMimeType = (path: string) =>
	path.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

export const assets = {
	favicon: {
		path: '/brand/favicon.svg',
		width: 64,
		height: 64,
		status: 'placeholder',
		prompt:
			'Create a distinctive simple brand mark for {{name}}. Legible at 16px. Flat vector geometry, no text, no fine details. Use {{color}}. Transparent background.'
	},
	logo: {
		path: '/brand/logo.svg',
		width: 64,
		height: 64,
		status: 'placeholder',
		prompt:
			'Use the approved favicon mark for {{name}} as the logo symbol. Preserve its exact geometry and colors. Transparent background; no invented wordmark.'
	},
	appleIcon: {
		path: '/brand/apple-touch-icon.png',
		width: 180,
		height: 180,
		status: 'placeholder',
		prompt:
			'Adapt the approved {{name}} mark to an opaque square icon. Keep generous padding. No rounded outer corners baked into the image.'
	},
	appIcon: {
		path: '/brand/icon-192.png',
		width: 192,
		height: 192,
		status: 'placeholder',
		prompt:
			'Export the approved {{name}} app icon on an opaque background. Same mark and palette as appleIcon.'
	},
	maskableIcon: {
		path: '/brand/icon-512.png',
		width: 512,
		height: 512,
		status: 'placeholder',
		prompt:
			'Create a maskable variant of the approved {{name}} app icon. Essential artwork must fit inside the central circle with radius 40% of the canvas.'
	},
	socialImage: {
		path: '/brand/social-preview.png',
		width: 1200,
		height: 630,
		status: 'placeholder',
		prompt:
			'Create a social sharing illustration for {{name}}: {{description}}. Follow the approved brand mark and {{color}} palette. Leave safe margins and room for the title. Do not generate text; overlay the exact app name with typography in a design tool after generation.'
	},
	hero: {
		path: '/brand/hero.svg',
		width: 1600,
		height: 900,
		status: 'placeholder',
		prompt:
			'Create a product hero illustration for {{name}}: {{description}}. Show only capabilities approved in the PRD. Use the approved visual direction and {{color}} accent. No fake product screenshots, statistics, testimonials, logos, or text.'
	},
	emptyState: {
		path: '/brand/empty-state.svg',
		width: 480,
		height: 320,
		status: 'placeholder',
		prompt:
			'Create a quiet empty-state illustration for {{name}}. Clear at small sizes, restrained {{color}} accent, transparent background, no text or implied error. Match the hero illustration style.'
	}
} satisfies Record<string, Asset>;
