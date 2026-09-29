import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'slices'];
const violations = [
	[/\$:\s/, 'legacy $: reactive statement'],
	[/\bexport\s+let\b/, 'legacy export let props'],
	[/\bon:[a-zA-Z]+\s*=/, 'legacy on:event directive'],
	[/\bcreateEventDispatcher\b/, 'legacy createEventDispatcher'],
	[/<slot(?:\s|>|\/)/, 'legacy <slot>']
];
const failures = [];

async function walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) await walk(path);
		else if (entry.name.endsWith('.svelte')) {
			const text = await readFile(path, 'utf8');
			for (const [pattern, label] of violations) {
				if (pattern.test(text)) failures.push(`${path}: ${label}`);
			}
		}
	}
}
for (const root of roots) await walk(root);
if (failures.length) {
	console.error(failures.join('\n'));
	process.exit(1);
}
console.log('Svelte 5 guard: no legacy syntax in src/ or slices/.');
