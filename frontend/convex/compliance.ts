import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

/**
 * DEFA Compliance Documents — Convex Functions
 * Vector search for RAG-based compliance queries.
 */

// Insert a document with embedding
export const insert = mutation({
    args: {
        title: v.string(),
        content: v.string(),
        source: v.string(),
        category: v.string(),
        embedding: v.array(v.float64()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("defa_documents", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Vector search for similar documents
export const searchSimilar = action({
    args: {
        embedding: v.array(v.float64()),
        limit: v.optional(v.number()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, { embedding, limit, category }) => {
        const filterCondition = category
            ? (q: any) => q.eq("category", category)
            : undefined;

        const results = await ctx.vectorSearch("defa_documents", "by_embedding", {
            vector: embedding,
            limit: limit ?? 5,
            filter: filterCondition,
        });

        // Fetch full documents for the matched results
        const docs = await Promise.all(
            results.map(async (result: any) => {
                const doc = await ctx.runQuery(
                    // internal function to get doc by ID
                    "compliance:getById" as any,
                    { id: result._id }
                );
                return { ...doc, score: result._score };
            })
        );

        return docs;
    },
});

// Internal: get document by ID (used by vector search action)
export const getById = query({
    args: { id: v.id("defa_documents") },
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

// Get all documents (for admin/debug)
export const listAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("defa_documents").collect();
    },
});
