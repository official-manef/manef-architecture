import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	notes: defineTable({
		owner: v.string(),
		body: v.string(),
		updatedAt: v.number()
	}).index('by_owner', ['owner'])
});
