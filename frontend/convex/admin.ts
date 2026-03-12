import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const resetUser = mutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        // 1. Delete Profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (profile) {
            await ctx.db.delete(profile._id);
        }

        // 2. Delete Dashboard
        const dashboardRecord = await ctx.db
            .query("dashboard")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (dashboardRecord) {
            await ctx.db.delete(dashboardRecord._id);
        }

        // 3. Delete Shadow Ledgers
        const ledgers = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .collect();
        for (const l of ledgers) {
            await ctx.db.delete(l._id);
        }

        // 4. Delete Product Listings
        const listings = await ctx.db
            .query("product_listings")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .collect();
        for (const l of listings) {
            await ctx.db.delete(l._id);
        }

        // 5. Delete Export Queries
        const queries = await ctx.db
            .query("export_queries")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .collect();
        for (const q of queries) {
            await ctx.db.delete(q._id);
        }

        return {
            status: "success",
            message: `Reset complete for ${args.clerkId}`,
            deleted: {
                profile: profile ? 1 : 0,
                dashboard: dashboardRecord ? 1 : 0,
                ledgers: ledgers.length,
                listings: listings.length,
                queries: queries.length,
            }
        };
    },
});
