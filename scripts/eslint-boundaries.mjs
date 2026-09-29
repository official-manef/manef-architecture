import path from 'node:path';
import { builtinModules } from 'node:module';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sliceRoot = path.join(projectRoot, 'slices');
const convexRoot = path.join(projectRoot, 'src', 'convex');
const serverRoot = path.join(projectRoot, 'src', 'lib', 'server');

/** @typedef {import('estree').ImportDeclaration | import('estree').ExportNamedDeclaration | import('estree').ExportAllDeclaration | import('estree').ImportExpression} ModuleNode */
/** @param {ModuleNode} node */
function moduleSource(node) {
	const source = node.source;
	if (source?.type === 'Literal' && typeof source.value === 'string') return source.value;
	if (source?.type === 'TemplateLiteral' && source.expressions.length === 0) {
		return source.quasis[0].value.cooked ?? undefined;
	}
}

/** @param {string} directory @param {string} target */
function inside(directory, target) {
	const relative = path.relative(directory, target);
	return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** @param {string} filename @param {string} source */
function resolveLocal(filename, source) {
	// Query suffixes do not change the module's runtime ownership.
	const value = source.split(/[?#]/)[0];
	for (const [alias, directory] of [
		['$features', sliceRoot],
		['$lib', path.join(projectRoot, 'src', 'lib')]
	]) {
		if (value === alias || value.startsWith(`${alias}/`)) {
			return path.resolve(directory, value.slice(alias.length + 1));
		}
	}
	if (value.startsWith('.')) return path.resolve(path.dirname(filename), value);
	if (path.isAbsolute(value)) return path.resolve(value);
}

/** @param {ModuleNode} node */
function typeOnly(node) {
	if ('importKind' in node && node.importKind === 'type') return true;
	if ('exportKind' in node && node.exportKind === 'type') return true;
	return (
		'specifiers' in node &&
		node.specifiers.length > 0 &&
		node.specifiers.every(
			(specifier) =>
				('importKind' in specifier && specifier.importKind === 'type') ||
				('exportKind' in specifier && specifier.exportKind === 'type')
		)
	);
}

/** @param {(node: ModuleNode) => void} check */
function moduleVisitors(check) {
	return {
		ImportDeclaration: check,
		ExportNamedDeclaration: check,
		ExportAllDeclaration: check,
		ImportExpression: check
	};
}

// Resolve aliases and relative paths so alternate spellings cannot bypass slice barrels.
/** @type {import('eslint').Rule.RuleModule} */
export const sliceBoundary = {
	meta: {
		type: 'problem',
		schema: [],
		messages: { barrel: 'Import another slice through $features/{{slice}}, not its internals.' }
	},
	create(context) {
		const filename = context.filename;
		const owner = path.relative(sliceRoot, filename).split(path.sep)[0];
		/** @param {ModuleNode} node */
		function check(node) {
			const value = moduleSource(node);
			if (!value) return;
			const target = resolveLocal(filename, value);
			if (!target || !inside(sliceRoot, target)) return;
			const relative = path.relative(sliceRoot, target);
			const [slice, ...segments] = relative.split(path.sep);
			if (
				slice === owner ||
				segments.length === 0 ||
				/^index(?:\.[cm]?[jt]s)?$/.test(segments.join('/'))
			)
				return;
			context.report({ node, messageId: 'barrel', data: { slice } });
		}
		return moduleVisitors(check);
	}
};

/** @type {import('eslint').Rule.RuleModule} */
export const runtimeBoundary = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			server:
				'Browser-capable code cannot import {{source}}. Move runtime work to a server module.',
			convex: 'Convex runs separately from SvelteKit; do not import {{source}} into Convex.',
			convexNode: 'Node built-ins require a Convex action module with a "use node" directive.',
			function:
				'Call Convex functions through the generated API; do not import backend implementation {{source}}.'
		}
	},
	create(context) {
		const filename = context.filename;
		const isConvex = inside(convexRoot, filename);
		const isNode = context.sourceCode.ast.body.some(
			(node) => 'directive' in node && node.directive === 'use node'
		);
		const isServer =
			inside(serverRoot, filename) || /(?:\.server|[\\/]\+server)\.[cm]?[jt]s$/.test(filename);
		/** @param {ModuleNode} node */
		function check(node) {
			const source = moduleSource(node);
			if (!source) return;
			const target = resolveLocal(filename, source);
			if (isConvex) {
				if (
					/^(?:\$(?:app|env|lib|features)(?:\/|$)|\$service-worker$|@sveltejs\/kit(?:\/|$))/.test(
						source
					) ||
					(target &&
						(inside(serverRoot, target) ||
							inside(sliceRoot, target) ||
							inside(path.join(projectRoot, 'src', 'routes'), target) ||
							/\.svelte$/.test(target)))
				) {
					context.report({ node, messageId: 'convex', data: { source } });
				}
				if (
					!isNode &&
					!typeOnly(node) &&
					(source.startsWith('node:') || builtinModules.includes(source))
				) {
					context.report({ node, messageId: 'convexNode' });
				}
				return;
			}
			// Erased type imports do not pull private runtime code into a browser bundle.
			if (typeOnly(node)) return;
			if (
				target &&
				inside(convexRoot, target) &&
				!/^_generated[\\/](?:api|dataModel)(?:\.[cm]?[jt]s)?$/.test(
					path.relative(convexRoot, target)
				)
			) {
				context.report({ node, messageId: 'function', data: { source } });
				return;
			}
			if (
				!isServer &&
				(/^(?:\$env\/(?:static|dynamic)\/private|\$app\/(?:server|env\/private))(?:\/|$)/.test(
					source
				) ||
					source.startsWith('node:') ||
					builtinModules.includes(source) ||
					source === 'convex/server' ||
					(target &&
						(inside(serverRoot, target) ||
							/(?:\.server|[\\/]\+server)(?:\.[cm]?[jt]s)?$/.test(target))))
			) {
				context.report({ node, messageId: 'server', data: { source } });
			}
		}
		return moduleVisitors(check);
	}
};
