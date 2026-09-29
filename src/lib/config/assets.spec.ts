import { expect, test } from 'vitest';
import { validateSvg } from '../../../scripts/validate-svg';

const svg = (content: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${content}</svg>`;

test('reviewed static geometry and local gradient paints remain usable', () => {
	const generated = svg(
		'<title>Brand &amp; Partners &lt;preview&gt;</title><rect width="64" height="64" fill="#fafafa"/><g fill="none" stroke="#171717" stroke-width="2.5" stroke-linejoin="round"><path d="M0,10 L10,0 L20,10 Z"/></g>'
	);
	const gradient = svg(
		'<defs><linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="1" stop-color="rgb(20, 30, 40)" stop-opacity="0.8"/></linearGradient><linearGradient id="copy" href="#accent"/></defs><rect x="0" y="0" width="64" height="64" fill="url(#copy)"/>'
	);
	expect(() => validateSvg(generated)).not.toThrow();
	expect(() => validateSvg(gradient)).not.toThrow();
});

test('active XML, encoded URLs, external references and unsupported namespaces are rejected', () => {
	for (const source of [
		svg(
			'<foreignObject width="64" height="64"><iframe xmlns="http://www.w3.org/1999/xhtml" srcdoc="&lt;scr&#105;pt>alert(1)&lt;/scr&#105;pt>"></iframe></foreignObject>'
		),
		svg('<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script>'),
		svg('<linearGradient href="javas&#99;ript:alert(1)"/>'),
		svg('<linearGradient href="//example.com/gradient.svg#paint"/>'),
		svg('<linearGradient href="other.svg#paint"/>'),
		svg('<linearGradient xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#paint"/>'),
		svg('<rect width="64" height="64" fill="url(https://example.com/paint)"/>'),
		svg('<rect width="64" height="64" style="fill:red"/>'),
		svg('<style>rect { fill: red }</style>'),
		svg('<rect onload="alert(1)"/>'),
		svg('<animate attributeName="href" values="javascript:alert(1)"/>'),
		svg('<set attributeName="href" to="javascript:alert(1)"/>'),
		'<!DOCTYPE svg [<!ENTITY mark "value">]>' + svg('<title>&mark;</title>'),
		'<?xml-stylesheet href="https://example.com/style.css"?>' + svg(''),
		svg('<title>&#60;script&#62;</title>')
	]) {
		expect(() => validateSvg(source)).toThrow('simplify to reviewed static geometry');
	}
});

test('malformed and ambiguous XML cannot pass the static SVG check', () => {
	for (const source of [
		svg('<g><rect/></path>'),
		svg('<rect width="64" width="32"/>'),
		svg('<rect width="64"height="32"/>'),
		svg('<title>Brand & partners</title>'),
		svg('<title><rect/></title>'),
		svg('') + svg(''),
		'<svg xmlns="http://www.w3.org/2000/svg">',
		'<svg xmlns="http://www.w3.org/1999/xhtml"/>',
		'<svg/>',
		svg('<svg xmlns="http://www.w3.org/2000/svg"/>'),
		svg('uncontained text')
	]) {
		expect(() => validateSvg(source)).toThrow('Unsupported or malformed SVG');
	}
});
