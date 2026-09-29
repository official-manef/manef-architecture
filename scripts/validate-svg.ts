const attributes: Record<string, readonly string[]> = {
	svg: ['xmlns', 'width', 'height', 'viewBox', 'preserveAspectRatio'],
	g: [],
	defs: [],
	title: [],
	desc: [],
	path: ['d', 'pathLength'],
	rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'pathLength'],
	circle: ['cx', 'cy', 'r', 'pathLength'],
	ellipse: ['cx', 'cy', 'rx', 'ry', 'pathLength'],
	line: ['x1', 'y1', 'x2', 'y2', 'pathLength'],
	polyline: ['points', 'pathLength'],
	polygon: ['points', 'pathLength'],
	linearGradient: [
		'x1',
		'y1',
		'x2',
		'y2',
		'gradientUnits',
		'gradientTransform',
		'spreadMethod',
		'href'
	],
	radialGradient: [
		'cx',
		'cy',
		'r',
		'fx',
		'fy',
		'fr',
		'gradientUnits',
		'gradientTransform',
		'spreadMethod',
		'href'
	],
	stop: ['offset', 'stop-color', 'stop-opacity'],
	clipPath: ['clipPathUnits'],
	mask: ['x', 'y', 'width', 'height', 'maskUnits', 'maskContentUnits']
};
const common = new Set([
	'id',
	'fill',
	'fill-opacity',
	'fill-rule',
	'stroke',
	'stroke-width',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-opacity',
	'opacity',
	'transform',
	'vector-effect',
	'clip-path',
	'clip-rule',
	'mask',
	'color'
]);
const paint = new Set(['fill', 'stroke', 'color', 'stop-color']);
const fragment = /^#[A-Za-z_][\w.-]*$/;
const localPaint = /^url\(#[A-Za-z_][\w.-]*\)$/;

function requireSvg(condition: unknown): asserts condition {
	if (!condition) {
		throw new Error(
			'Unsupported or malformed SVG: simplify to reviewed static geometry with local fragment references; remove HTML, scripts, CSS, namespaces and entities.'
		);
	}
}

function validateAttribute(tag: string, name: string, value: string) {
	requireSvg(attributes[tag].includes(name) || common.has(name));
	// Entity expansion is deliberately unsupported in attributes, including encoded URLs.
	requireSvg(!/[&<>]/.test(value));
	if (name === 'xmlns') {
		requireSvg(value === 'http://www.w3.org/2000/svg');
	} else if (name === 'href') {
		requireSvg(fragment.test(value));
	} else if (name === 'clip-path' || name === 'mask') {
		requireSvg(value === 'none' || localPaint.test(value));
	} else if (paint.has(name)) {
		requireSvg(
			localPaint.test(value) ||
				/^(?:[A-Za-z]+|#[\da-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.,%+\-\s]+\))$/.test(value)
		);
	} else if (name === 'id') {
		requireSvg(/^[A-Za-z_][\w.-]*$/.test(value));
	} else {
		requireSvg(/^[\w.,%#+()\s-]*$/.test(value));
	}
}

/** Validates a deliberately small static SVG subset; never sanitizes arbitrary SVG. */
export function validateSvg(source: string): void {
	requireSvg(typeof source === 'string' && source.length <= 1_000_000);
	for (const character of source) requireSvg(character >= ' ' || '\t\n\r'.includes(character));
	const stack: string[] = [];
	let position = 0;
	let opened = false;
	while (position < source.length) {
		if (source[position] !== '<') {
			const next = source.indexOf('<', position);
			const end = next === -1 ? source.length : next;
			const text = source.slice(position, end);
			if (stack.at(-1) === 'title' || stack.at(-1) === 'desc') {
				requireSvg(!/&(?!(?:amp|lt|gt|quot|apos);)|\]\]>/.test(text));
			} else requireSvg(/^\s*$/.test(text));
			position = end;
			continue;
		}
		const closing = /^<\/([A-Za-z][A-Za-z0-9]*)\s*>/.exec(source.slice(position));
		if (closing) {
			requireSvg(stack.pop() === closing[1]);
			position += closing[0].length;
			continue;
		}
		const opening = /^<([A-Za-z][A-Za-z0-9]*)/.exec(source.slice(position));
		requireSvg(opening);
		const tag = opening[1];
		requireSvg(Object.hasOwn(attributes, tag));
		requireSvg(stack.at(-1) !== 'title' && stack.at(-1) !== 'desc');
		if (stack.length === 0) {
			requireSvg(!opened && tag === 'svg');
			opened = true;
		} else requireSvg(tag !== 'svg' && stack.length < 64);
		position += opening[0].length;
		const seen = new Set<string>();
		while (true) {
			const ending = /^\s*(\/?)>/.exec(source.slice(position));
			if (ending) {
				if (tag === 'svg') requireSvg(seen.has('xmlns'));
				if (!ending[1]) stack.push(tag);
				position += ending[0].length;
				break;
			}
			const attribute = /^\s+([A-Za-z][A-Za-z0-9:-]*)\s*=\s*(["'])([^<]*?)\2/.exec(
				source.slice(position)
			);
			requireSvg(attribute);
			const [, name, , value] = attribute;
			requireSvg(!seen.has(name));
			validateAttribute(tag, name, value);
			seen.add(name);
			position += attribute[0].length;
		}
	}
	requireSvg(opened && stack.length === 0);
}
