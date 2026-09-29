import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../../../convex/schema';
import { api } from '../../../convex/_generated/api';

const modules = import.meta.glob('../../../convex/**/*.*s');
const identity = (subject: string) => ({
	issuer: 'https://accounts.google.com',
	subject,
	tokenIdentifier: `https://accounts.google.com|${subject}`
});

test('notes deny anonymous reads and all mutations', async () => {
	const t = convexTest(schema, modules);
	const alice = t.withIdentity(identity('alice'));
	const id = await alice.mutation(api.notes.create, { body: 'Private draft' });
	await expect(t.query(api.notes.list)).rejects.toThrow('Sign in');
	await expect(t.mutation(api.notes.create, { body: 'Anonymous' })).rejects.toThrow('Sign in');
	await expect(t.mutation(api.notes.update, { id, body: 'Changed' })).rejects.toThrow('Sign in');
	await expect(t.mutation(api.notes.remove, { id })).rejects.toThrow('Sign in');
});

test('users can create, list, edit and delete only their own notes', async () => {
	const t = convexTest(schema, modules);
	const alice = t.withIdentity(identity('alice'));
	const bob = t.withIdentity(identity('bob'));
	const id = await alice.mutation(api.notes.create, { body: ' Private draft ' });
	expect(await bob.query(api.notes.list)).toEqual([]);
	await expect(bob.mutation(api.notes.update, { id, body: 'Stolen' })).rejects.toThrow(
		'Note not found'
	);
	await expect(bob.mutation(api.notes.remove, { id })).rejects.toThrow('Note not found');
	expect(await alice.query(api.notes.list)).toEqual([
		expect.objectContaining({ _id: id, body: 'Private draft' })
	]);
	expect((await alice.query(api.notes.list))[0]).not.toHaveProperty('owner');
	await alice.mutation(api.notes.update, { id, body: 'Revised draft' });
	expect((await alice.query(api.notes.list))[0].body).toBe('Revised draft');
	await alice.mutation(api.notes.remove, { id });
	expect(await alice.query(api.notes.list)).toEqual([]);
});

test('note size, account quota and argument validators reject invalid client input', async () => {
	const t = convexTest(schema, modules);
	const alice = t.withIdentity(identity('alice'));
	await expect(alice.mutation(api.notes.create, { body: ' ' })).rejects.toThrow('2,000');
	await expect(alice.mutation(api.notes.create, { body: 'x'.repeat(2001) })).rejects.toThrow(
		'2,000'
	);
	await expect(
		alice.mutation(api.notes.create, {
			body: 'Attempt',
			owner: identity('bob').tokenIdentifier
		} as { body: string })
	).rejects.toThrow();
	await t.run(async (ctx) => {
		for (let i = 0; i < 100; i++)
			await ctx.db.insert('notes', {
				owner: identity('alice').tokenIdentifier,
				body: `Note ${i}`,
				updatedAt: Date.now()
			});
	});
	expect(await alice.query(api.notes.list)).toHaveLength(100);
	await expect(alice.mutation(api.notes.create, { body: 'Overflow' })).rejects.toThrow('100 notes');
});
