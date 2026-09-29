import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { assets, assetMimeType } from '../assets.config';
import { appConfig } from '../src/lib/config/app';
import { validateSvg } from './validate-svg';

const command = process.argv[2];
assert(['generate', 'check', 'prompts'].includes(command), 'Use assets.ts generate|check|prompts');
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const fingerprint = hash(JSON.stringify({ assets, appConfig }));
const escapeXml = (value: string) =>
	value.replace(
		/[<>&"']/g,
		(c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
	);
const manifestPath = 'static/brand/manifest.json';
const records: Record<string, { sha256: string }> = {};
const webmanifest =
	JSON.stringify(
		{
			name: appConfig.name,
			short_name: appConfig.shortName,
			description: appConfig.description,
			lang: appConfig.locale,
			start_url: '/',
			display: 'standalone',
			background_color: appConfig.backgroundColor,
			theme_color: appConfig.themeColor,
			icons: [
				{ asset: assets.appIcon, purpose: 'any' },
				{ asset: assets.maskableIcon, purpose: 'maskable' }
			].map(({ asset, purpose }) => ({
				src: asset.path,
				sizes: `${asset.width}x${asset.height}`,
				type: assetMimeType(asset.path),
				purpose
			}))
		},
		null,
		2
	) + '\n';
const promptDocument =
	'# Asset generation prompts\n\nGenerated from `assets.config.ts` and `src/lib/config/app.ts` using `bun run assets:prompts`.\nRead [the asset workflow](assets.md) first. Approve one mark, then reuse it for all icon variants.\n\n' +
	Object.entries(assets)
		.map(
			([key, asset]) =>
				`## ${key}\n\n- Output: \`${asset.path}\`\n- Canvas: ${asset.width} × ${asset.height}\n- Status: ${asset.status}\n\n${asset.prompt.replaceAll('{{name}}', appConfig.name).replaceAll('{{description}}', appConfig.description).replaceAll('{{color}}', appConfig.themeColor)}\n`
		)
		.join('\n');

assert.equal(
	new Set(Object.values(assets).map((asset) => asset.path)).size,
	Object.keys(assets).length,
	'Asset paths must be unique.'
);
for (const [key, asset] of Object.entries(assets)) {
	assert.match(asset.path, /^\/brand\/[a-z0-9-]+\.(svg|png)$/, `Invalid asset path: ${key}`);
	for (const size of [asset.width, asset.height])
		assert(
			Number.isInteger(size) && size > 0 && size <= 4096,
			`${key}: dimensions must be integers from 1 to 4096.`
		);
}

function svg(width: number, height: number) {
	const size = Math.min(width, height) * 0.44;
	const color = escapeXml(appConfig.themeColor);
	const background = escapeXml(appConfig.backgroundColor);
	const title = escapeXml(appConfig.name);
	const x = (width - size) / 2;
	const y = (height - size) / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${title} placeholder</title><rect width="${width}" height="${height}" fill="${background}"/><g fill="none" stroke="${color}" stroke-width="${size / 12}" stroke-linejoin="round"><path d="M${x},${y + size / 2} L${x + size / 2},${y} L${x + size},${y + size / 2} L${x + size / 2},${y + size} Z"/><path d="M${x + size / 4},${y + size / 2} L${x + size / 2},${y + size / 4} L${x + size * 0.75},${y + size / 2} L${x + size / 2},${y + size * 0.75} Z"/></g></svg>\n`;
}

if (command === 'prompts') {
	mkdirSync('docs', { recursive: true });
	writeFileSync('docs/assets-prompts.md', promptDocument);
	console.log('Wrote docs/assets-prompts.md');
} else {
	const saved = existsSync(manifestPath)
		? JSON.parse(readFileSync(manifestPath, 'utf8'))
		: undefined;
	if (command === 'check') {
		assert(saved, 'Asset manifest missing; run assets:generate.');
		assert.equal(
			saved.fingerprint,
			fingerprint,
			'Brand or asset config changed: run assets:generate and assets:prompts.'
		);
		assert.equal(
			readFileSync('docs/assets-prompts.md', 'utf8'),
			promptDocument,
			'Prompts are stale; run assets:prompts.'
		);
	}
	// Check every file before writing any, so a modified placeholder is never partially overwritten.
	if (command === 'generate')
		for (const [key, asset] of Object.entries(assets)) {
			assert.match(asset.path, /^\/brand\/[a-z0-9-]+\.(svg|png)$/, `Invalid asset path: ${key}`);
			if (asset.status === 'placeholder' && existsSync(`static${asset.path}`)) {
				assert.equal(
					hash(readFileSync(`static${asset.path}`)),
					saved?.assets[key]?.sha256,
					`${key} has local artwork: set status to custom before generating.`
				);
			}
		}
	mkdirSync('static/brand', { recursive: true });
	for (const [key, asset] of Object.entries(assets)) {
		assert.match(asset.path, /^\/brand\/[a-z0-9-]+\.(svg|png)$/, `Invalid asset path: ${key}`);
		const path = `static${asset.path}`;
		if (command === 'generate' && asset.status === 'placeholder') {
			const source = svg(asset.width, asset.height);
			writeFileSync(
				path,
				asset.path.endsWith('.svg')
					? source
					: new Resvg(source, { font: { loadSystemFonts: false } }).render().asPng()
			);
		}
		const data = readFileSync(path);
		let width: number, height: number;
		if (asset.path.endsWith('.png')) {
			assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${key} must be PNG`);
			width = data.readUInt32BE(16);
			height = data.readUInt32BE(20);
		} else {
			const source = data.toString();
			validateSvg(source);
			const rendered = new Resvg(source, { font: { loadSystemFonts: false } });
			width = rendered.width;
			height = rendered.height;
		}
		assert.equal(width, asset.width, `${key}: incorrect width`);
		assert.equal(height, asset.height, `${key}: incorrect height`);
		records[key] = { sha256: hash(data) };
		if (command === 'check')
			assert.equal(
				saved.assets[key]?.sha256,
				records[key].sha256,
				`${key} changed: set custom status if appropriate, then run assets:generate`
			);
	}
	if (command === 'generate') {
		writeFileSync(manifestPath, JSON.stringify({ fingerprint, assets: records }, null, 2) + '\n');
		writeFileSync('static/site.webmanifest', webmanifest);
	} else
		assert.equal(
			readFileSync('static/site.webmanifest', 'utf8'),
			webmanifest,
			'Web manifest is stale; run assets:generate'
		);
	console.log(
		`${Object.keys(assets).length} assets ${command === 'check' ? 'verified' : 'prepared'}; custom files are preserved.`
	);
}
