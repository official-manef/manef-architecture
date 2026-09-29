import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

const note = v.object({
	_id: v.id('notes'),
	_creationTime: v.number(),
	body: v.string(),
	updatedAt: v.number()
});
const MAX_NOTES = 100;

async function owner(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new ConvexError('Sign in to use private notes.');
	return identity.tokenIdentifier;
}

function bodyText(body: string) {
	const text = body.trim();
	if (!text || text.length > 2000)
		throw new ConvexError('A note must contain between 1 and 2,000 characters.');
	return text;
}

export const list = query({
	args: {},
	returns: v.array(note),
	handler: async (ctx) => {
		const identity = await owner(ctx);
		const notes = await ctx.db
			.query('notes')
			.withIndex('by_owner', (q) => q.eq('owner', identity))
			.order('desc')
			.take(MAX_NOTES);
		return notes.map(({ _id, _creationTime, body, updatedAt }) => ({
			_id,
			_creationTime,
			body,
			updatedAt
		}));
	}
});

export const create = mutation({
	args: { body: v.string() },
	returns: v.id('notes'),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const body = bodyText(args.body);
		const existing = await ctx.db
			.query('notes')
			.withIndex('by_owner', (q) => q.eq('owner', identity))
			.take(MAX_NOTES);
		if (existing.length >= MAX_NOTES)
			throw new ConvexError('This example allows up to 100 notes per account.');
		return await ctx.db.insert('notes', { owner: identity, body, updatedAt: Date.now() });
	}
});

export const update = mutation({
	args: { id: v.id('notes'), body: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const existing = await ctx.db.get('notes', args.id);
		if (!existing || existing.owner !== identity) throw new ConvexError('Note not found.');
		await ctx.db.patch('notes', args.id, { body: bodyText(args.body), updatedAt: Date.now() });
		return null;
	}
});

export const remove = mutation({
	args: { id: v.id('notes') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const existing = await ctx.db.get('notes', args.id);
		if (!existing || existing.owner !== identity) throw new ConvexError('Note not found.');
		await ctx.db.delete('notes', args.id);
		return null;
	}
});
