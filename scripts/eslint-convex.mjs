// The upstream 4.0.0 collect rule reports unrelated objects with a collect method.
// Keep this narrow replacement until its ordinary-object regression test passes upstream.

/** @type {import('eslint').Rule.RuleModule} */
export const noConvexCollect = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			bounded:
				'Bound Convex reads with take() or paginate(). A small fixed collection needs a documented line-level exception.'
		}
	},
	create(context) {
		/** @type {{ program?: import('typescript').Program, esTreeNodeToTSNodeMap?: Map<import('estree').Node, import('typescript').Node> }} */
		const services = context.sourceCode.parserServices;
		const checker = services.program?.getTypeChecker();
		const nodeMap = services.esTreeNodeToTSNodeMap;
		if (!checker || !nodeMap) throw new Error('starter/no-convex-collect requires typed linting.');

		/** @param {import('typescript').Type} type */
		function isConvexQuery(type) {
			if (type.isUnionOrIntersection()) return type.types.some(isConvexQuery);
			return (
				type
					.getSymbol()
					?.getDeclarations()
					?.some((declaration) => {
						const filename = declaration.getSourceFile().fileName.replaceAll('\\', '/');
						return /\/node_modules\/convex\/(?:src|dist\/[^/]+)\/server\/query\.(?:d\.)?ts$/.test(
							filename
						);
					}) ?? false
			);
		}

		return {
			CallExpression(node) {
				const member = node.callee;
				if (member.type !== 'MemberExpression') return;
				const name =
					member.computed && member.property.type === 'Literal'
						? member.property.value
						: !member.computed && member.property.type === 'Identifier'
							? member.property.name
							: undefined;
				if (name !== 'collect') return;
				const receiver = nodeMap.get(member.object);
				if (receiver && isConvexQuery(checker.getTypeAtLocation(receiver))) {
					context.report({ node, messageId: 'bounded' });
				}
			}
		};
	}
};
