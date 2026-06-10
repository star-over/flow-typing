import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  health: defineTable({
    tickedAt: v.number(),
  }),
});
