import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Dashboard — Convex Functions
 * Pre-screening financial metrics, bank data, proxy credit score, and audit results.
 * Separated from profiles for clean separation of concerns (identity vs. financial).
 */

// Get dashboard data by Clerk ID
export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        return await ctx.db
            .query("dashboard")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();
    },
});

// Create or update dashboard with bank data + audit results
export const upsertBankData = mutation({
    args: {
        clerkId: v.string(),
        bankData: v.object({
            adb: v.number(),
            amb: v.optional(v.number()),
            dsr: v.number(),
            volatility: v.number(),
            monthsAnalyzed: v.optional(v.number()),
            extractedAt: v.number(),
            // Extended metrics
            monthlyInflow: v.optional(v.number()),
            monthlyOutflow: v.optional(v.number()),
            bounceCount: v.optional(v.number()),
            lowestBalance: v.optional(v.number()),
            netCashFlow: v.optional(v.number()),
            dscr: v.optional(v.number()),
            expenseRatio: v.optional(v.number()),
            overdraftCount: v.optional(v.number()),
            revenueConsistency: v.optional(v.number()),
            avgMonthlyBalance: v.optional(v.number()),
        }),
        proxyScore: v.number(),
        eligibilityVerdict: v.optional(v.string()),
        eligibilityProbability: v.optional(v.number()),
        eligibilityWeaknesses: v.optional(v.array(v.string())),
        // Audit fields
        auditStatus: v.optional(v.string()),
        auditColor: v.optional(v.string()),
        auditDate: v.optional(v.string()),
        strategicSummary: v.optional(v.string()),
        eligibilityIndex: v.optional(v.number()),
        riskClassification: v.optional(v.string()),
        auditWeaknesses: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            dragPct: v.number(),
        }))),
        auditOptimizations: v.optional(v.array(v.object({
            title: v.string(),
            steps: v.array(v.string()),
            targetWeakness: v.string(),
        }))),
        parseConfidence: v.optional(v.string()),
        fiveCsAnalysis: v.optional(v.array(v.object({
            label: v.string(),
            color: v.string(),
            summary: v.string(),
        }))),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("dashboard")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        const updates: Record<string, unknown> = {
            bankData: args.bankData,
            proxyScore: args.proxyScore,
        };

        // Eligibility fields
        if (args.eligibilityVerdict !== undefined) updates.eligibilityVerdict = args.eligibilityVerdict;
        if (args.eligibilityProbability !== undefined) updates.eligibilityProbability = args.eligibilityProbability;
        if (args.eligibilityWeaknesses !== undefined) updates.eligibilityWeaknesses = args.eligibilityWeaknesses;

        // Audit fields
        if (args.auditStatus !== undefined) updates.auditStatus = args.auditStatus;
        if (args.auditColor !== undefined) updates.auditColor = args.auditColor;
        if (args.auditDate !== undefined) updates.auditDate = args.auditDate;
        if (args.strategicSummary !== undefined) updates.strategicSummary = args.strategicSummary;
        if (args.eligibilityIndex !== undefined) updates.eligibilityIndex = args.eligibilityIndex;
        if (args.riskClassification !== undefined) updates.riskClassification = args.riskClassification;
        if (args.auditWeaknesses !== undefined) updates.auditWeaknesses = args.auditWeaknesses;
        if (args.auditOptimizations !== undefined) updates.auditOptimizations = args.auditOptimizations;
        if (args.parseConfidence !== undefined) updates.parseConfidence = args.parseConfidence;
        if (args.fiveCsAnalysis !== undefined) updates.fiveCsAnalysis = args.fiveCsAnalysis;

        if (existing) {
            await ctx.db.patch(existing._id, updates);
            return existing._id;
        }

        return await ctx.db.insert("dashboard", {
            clerkId: args.clerkId,
            ...updates,
            createdAt: Date.now(),
        });
    },
});

// Update proxy score only
export const updateProxyScore = mutation({
    args: {
        clerkId: v.string(),
        proxyScore: v.number(),
    },
    handler: async (ctx, { clerkId, proxyScore }) => {
        const existing = await ctx.db
            .query("dashboard")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { proxyScore });
            return existing._id;
        }

        return await ctx.db.insert("dashboard", {
            clerkId,
            proxyScore,
            createdAt: Date.now(),
        });
    },
});
