import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * User Profiles — Convex Functions
 * Links Clerk user IDs to WhatsApp phone numbers + MSME onboarding data.
 * Financial/audit data is now stored in the `dashboard` table.
 */

// Get profile by phone number (used by WhatsApp webhook)
export const getByPhone = query({
    args: { phoneNumber: v.string() },
    handler: async (ctx, { phoneNumber }) => {
        return await ctx.db
            .query("profiles")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
            .first();
    },
});

// Get profile by Clerk ID
export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        return await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();
    },
});

// Create or update a profile
export const upsert = mutation({
    args: {
        clerkId: v.string(),
        phoneNumber: v.optional(v.string()),
        businessName: v.optional(v.string()),
        region: v.optional(v.string()),
        language: v.optional(v.string()),
        // Step 1
        ssmNumber: v.optional(v.string()),
        businessType: v.optional(v.string()),
        sector: v.optional(v.string()),
        yearsOperating: v.optional(v.number()),
        annualTurnover: v.optional(v.number()),
        businessSize: v.optional(v.string()),
        // Step 2
        loanPurpose: v.optional(v.string()),
        projectedRevenue12m: v.optional(v.number()),
        assetList: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
            estimatedValue: v.number(),
        }))),
        // Step 3
        ssmRegistered: v.optional(v.boolean()),
        crossBorderIntent: v.optional(v.boolean()),
        creditReportConsent: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existing) {
            const updates: Record<string, unknown> = {};
            const fields = [
                "phoneNumber", "businessName", "region", "language",
                "ssmNumber", "businessType", "sector", "yearsOperating",
                "annualTurnover", "businessSize", "loanPurpose",
                "projectedRevenue12m", "assetList",
                "ssmRegistered", "crossBorderIntent", "creditReportConsent",
            ] as const;
            for (const f of fields) {
                if ((args as Record<string, unknown>)[f] !== undefined) {
                    updates[f] = (args as Record<string, unknown>)[f];
                }
            }
            await ctx.db.patch(existing._id, updates);
            return existing._id;
        }

        return await ctx.db.insert("profiles", {
            clerkId: args.clerkId,
            phoneNumber: args.phoneNumber,
            businessName: args.businessName,
            region: args.region,
            language: args.language,
            ssmNumber: args.ssmNumber,
            businessType: args.businessType,
            sector: args.sector,
            yearsOperating: args.yearsOperating,
            annualTurnover: args.annualTurnover,
            businessSize: args.businessSize,
            loanPurpose: args.loanPurpose,
            projectedRevenue12m: args.projectedRevenue12m,
            assetList: args.assetList,
            ssmRegistered: args.ssmRegistered,
            crossBorderIntent: args.crossBorderIntent,
            creditReportConsent: args.creditReportConsent,
            createdAt: Date.now(),
        });
    },
});

// Link phone number to existing profile
export const updatePhone = mutation({
    args: {
        clerkId: v.string(),
        phoneNumber: v.string(),
    },
    handler: async (ctx, { clerkId, phoneNumber }) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { phoneNumber });
            return profile._id;
        }

        return await ctx.db.insert("profiles", {
            clerkId,
            phoneNumber,
            createdAt: Date.now(),
        });
    },
});

// Complete onboarding — set tier and mark done
export const completeOnboarding = mutation({
    args: {
        clerkId: v.string(),
        tier: v.string(),
    },
    handler: async (ctx, { clerkId, tier }) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();

        if (!profile) throw new Error("Profile not found");

        await ctx.db.patch(profile._id, {
            tier,
            onboardingComplete: true,
        });
        return profile._id;
    },
});

export const resetOnboarding = mutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();
        if (!profile) throw new Error("Profile not found");
        await ctx.db.patch(profile._id, { onboardingComplete: false });
    },
});
