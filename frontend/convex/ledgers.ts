import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Shadow-Ledger Convex Functions
 * Queries and mutations for financial ledger entries.
 */

// Insert a new ledger entry
export const insert = mutation({
    args: {
        clerkId: v.string(),
        source: v.optional(v.string()), // "web" | "whatsapp"
        rawText: v.string(),
        classification: v.string(),
        confidence: v.number(),
        itemDescription: v.string(),
        amountMyr: v.number(),
        transactionDate: v.string(),
        sentiment: v.number(),
        imageStorageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("shadow_ledgers", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Get ledger history for a user
export const getByUser = query({
    args: { clerkId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, { clerkId, limit }) => {
        return await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .order("desc")
            .take(limit ?? 50);
    },
});

// Get financial summary for a user
export const getSummary = query({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .collect();

        const totalInflow = entries
            .filter((e) => e.classification === "PAYMENT_IN")
            .reduce((sum, e) => sum + e.amountMyr, 0);

        const totalOutflow = entries
            .filter((e) => e.classification === "CAPITAL_OUT")
            .reduce((sum, e) => sum + e.amountMyr, 0);

        const netIncome = totalInflow - totalOutflow;

        const avgSentiment =
            entries.length > 0
                ? entries.reduce((sum, e) => sum + e.sentiment, 0) / entries.length
                : 0;

        const reliability = Math.min(
            100,
            Math.round(
                (entries.length * 5 + totalInflow * 0.01 + avgSentiment * 2) * 0.8
            )
        );

        return {
            totalRevenue: totalInflow, // backward compat
            totalInflow,
            totalOutflow,
            netIncome,
            totalEntries: entries.length,
            avgSentiment: Math.round(avgSentiment * 10) / 10,
            reliabilityScore: reliability,
        };
    },
});

// Get day-by-day breakdown for cash flow chart (last 7 days)
export const getDailyBreakdown = query({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .collect();

        // Build last 7 days
        const days: Record<string, { income: number; expense: number; count: number }> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
            days[key] = { income: 0, expense: 0, count: 0 };
        }

        for (const entry of entries) {
            const dateKey = entry.transactionDate?.split("T")[0];
            if (dateKey && days[dateKey] !== undefined) {
                days[dateKey].count += 1;
                if (entry.classification === "PAYMENT_IN") {
                    days[dateKey].income += entry.amountMyr;
                } else if (entry.classification === "CAPITAL_OUT") {
                    days[dateKey].expense += entry.amountMyr;
                }
            }
        }

        return Object.entries(days).map(([date, data]) => ({
            date,
            label: new Date(date + "T00:00:00").toLocaleDateString("en-MY", {
                weekday: "short",
                day: "numeric",
            }),
            ...data,
        }));
    },
});

// Get top items by frequency (for Export Compass)
export const getTopItems = query({
    args: { clerkId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, { clerkId, limit }) => {
        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .collect();

        const items: Record<string, { count: number; totalMyr: number }> = {};
        for (const entry of entries) {
            const key = entry.itemDescription || "Unknown";
            if (!items[key]) items[key] = { count: 0, totalMyr: 0 };
            items[key].count += 1;
            items[key].totalMyr += entry.amountMyr;
        }

        return Object.entries(items)
            .map(([item, data]) => ({ item, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit ?? 5);
    },
});

// Get daily income totals for annual heatmap (full year)
export const getHeatmapData = query({
    args: { clerkId: v.string(), year: v.optional(v.number()) },
    handler: async (ctx, { clerkId, year }) => {
        const targetYear = year ?? new Date().getFullYear();
        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .collect();

        // Build every day in the target year
        const days: Record<string, number> = {};
        const startDate = new Date(targetYear, 0, 1); // Jan 1
        const endDate = new Date(targetYear, 11, 31); // Dec 31
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            days[d.toISOString().split("T")[0]] = 0;
        }

        // Fill in net income data (inflow minus outflow)
        for (const entry of entries) {
            const dateKey = entry.transactionDate?.split("T")[0];
            if (dateKey && days[dateKey] !== undefined) {
                if (entry.classification === "PAYMENT_IN") {
                    days[dateKey] += entry.amountMyr;
                } else if (entry.classification === "CAPITAL_OUT") {
                    days[dateKey] -= entry.amountMyr;
                }
            }
        }

        const dailyData = Object.entries(days).map(([date, income]) => ({
            date,
            income,
        }));

        const maxIncome = Math.max(...dailyData.map((d) => d.income), 1);
        const totalRevenue = dailyData.reduce((s, d) => s + d.income, 0);
        const activeDays = dailyData.filter((d) => d.income > 0).length;
        const avgDaily = activeDays > 0 ? totalRevenue / activeDays : 0;
        const peakDay = dailyData.reduce((best, d) =>
            d.income > best.income ? d : best, { date: "", income: 0 }
        );

        // Available years (from all entries)
        const allYears = new Set<number>();
        allYears.add(targetYear);
        for (const entry of entries) {
            const y = entry.transactionDate?.split("-")[0];
            if (y) allYears.add(parseInt(y));
        }

        return {
            days: dailyData,
            maxIncome,
            totalRevenue,
            avgDaily,
            peakDay,
            activeDays,
            availableYears: Array.from(allYears).sort((a, b) => b - a),
        };
    },
});


// Get recent entries for streak tracking (last N days)
export const getRecentEntries = query({
    args: {
        clerkId: v.string(),
        days: v.number(),
    },
    handler: async (ctx, { clerkId, days }) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_date", (q) =>
                q.eq("clerkId", clerkId).gte("transactionDate", cutoffStr)
            )
            .collect();

        return entries.map((e) => ({
            transactionDate: e.transactionDate,
            createdAt: e.createdAt,
            classification: e.classification,
        }));
    },
});

// Delete ALL ledger entries for a user (factory reset)
export const deleteAllByUser = mutation({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        const entries = await ctx.db
            .query("shadow_ledgers")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .collect();

        let deleted = 0;
        for (const entry of entries) {
            await ctx.db.delete(entry._id);
            deleted++;
        }
        return { deleted };
    },
});

