import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Export Query Logs — Convex Functions
 * Tracks Sol3 compliance searches for predictive analytics market interest.
 */

// Log a compliance search
export const insert = mutation({
    args: {
        clerkId: v.string(),
        product: v.string(),
        destination: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("export_queries", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Get recent export queries for a user
export const getByUser = query({
    args: {
        clerkId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { clerkId, limit }) => {
        return await ctx.db
            .query("export_queries")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .order("desc")
            .take(limit ?? 20);
    },
});
