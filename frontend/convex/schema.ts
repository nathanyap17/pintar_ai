import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // User profiles — identity & business registration linked to Clerk user ID
    profiles: defineTable({
        clerkId: v.string(),
        phoneNumber: v.optional(v.string()),
        businessName: v.optional(v.string()),
        region: v.optional(v.string()),
        language: v.optional(v.string()),
        // Step 1: Business Profile Basics
        ssmNumber: v.optional(v.string()),
        businessType: v.optional(v.string()),
        sector: v.optional(v.string()),
        yearsOperating: v.optional(v.number()),
        annualTurnover: v.optional(v.number()),
        businessSize: v.optional(v.string()),
        // Step 2: Loan & Projection Details
        loanPurpose: v.optional(v.string()),
        projectedRevenue12m: v.optional(v.number()),
        assetList: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
            estimatedValue: v.number(),
        }))),
        // Step 3: Financial Uploads & Consent
        ssmRegistered: v.optional(v.boolean()),
        crossBorderIntent: v.optional(v.boolean()),
        creditReportConsent: v.optional(v.boolean()),
        onboardingComplete: v.optional(v.boolean()),
        tier: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_phone", ["phoneNumber"]),

    // Dashboard — pre-screening financial metrics & audit results
    dashboard: defineTable({
        clerkId: v.string(),
        bankData: v.optional(v.object({
            adb: v.number(),
            amb: v.optional(v.number()),
            dsr: v.number(),
            volatility: v.number(),
            monthsAnalyzed: v.optional(v.number()),
            extractedAt: v.number(),
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
        })),
        proxyScore: v.optional(v.number()),
        eligibilityVerdict: v.optional(v.string()),
        eligibilityProbability: v.optional(v.number()),
        eligibilityWeaknesses: v.optional(v.array(v.string())),
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
        createdAt: v.number(),
    }).index("by_clerk_id", ["clerkId"]),

    // Shadow-Ledger entries — financial data extracted from receipts
    shadow_ledgers: defineTable({
        clerkId: v.string(),
        source: v.optional(v.string()),
        rawText: v.string(),
        classification: v.string(),
        confidence: v.number(),
        itemDescription: v.string(),
        amountMyr: v.number(),
        transactionDate: v.string(),
        sentiment: v.number(),
        imageStorageId: v.optional(v.id("_storage")),
        createdAt: v.number(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_date", ["clerkId", "transactionDate"]),

    // Product listings — bilingual e-commerce listings (VernStudio)
    product_listings: defineTable({
        clerkId: v.string(),
        originalImageStorageId: v.optional(v.id("_storage")),
        enhancedImageStorageId: v.optional(v.id("_storage")),
        transcript: v.optional(v.string()),
        titleEn: v.string(),
        descEn: v.string(),
        titleZh: v.optional(v.string()),
        descZh: v.optional(v.string()),
        seoTags: v.array(v.string()),
        createdAt: v.number(),
    }).index("by_clerk_id", ["clerkId"]),

    // Export query logs — tracks Compliance Sentinel searches
    export_queries: defineTable({
        clerkId: v.string(),
        product: v.string(),
        destination: v.string(),
        status: v.string(),
        createdAt: v.number(),
    }).index("by_clerk_id", ["clerkId"]),

    // DEFA compliance documents — vector-indexed for RAG
    defa_documents: defineTable({
        title: v.string(),
        content: v.string(),
        source: v.string(),
        category: v.string(),
        embedding: v.array(v.float64()),
        createdAt: v.number(),
    }).vectorIndex("by_embedding", {
        vectorField: "embedding",
        dimensions: 384,
        filterFields: ["category"],
    }),
});
