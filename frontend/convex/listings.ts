import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Product Listings Convex Functions
 */

export const insert = mutation({
    args: {
        clerkId: v.string(),
        originalImageStorageId: v.optional(v.id("_storage")),
        enhancedImageStorageId: v.optional(v.id("_storage")),
        transcript: v.optional(v.string()),
        titleEn: v.string(),
        descEn: v.string(),
        titleZh: v.optional(v.string()),
        descZh: v.optional(v.string()),
        seoTags: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("product_listings", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const getByUser = query({
    args: { clerkId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, { clerkId, limit }) => {
        return await ctx.db
            .query("product_listings")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .order("desc")
            .take(limit ?? 20);
    },
});

// Generate a file upload URL
export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Get a file serving URL
export const getFileUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        return await ctx.storage.getUrl(storageId);
    },
});
