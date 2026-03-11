import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // User profiles — linked to Clerk user ID + optional WhatsApp phone
    profiles: defineTable({
        clerkId: v.string(),
        phoneNumber: v.optional(v.string()),
        businessName: v.optional(v.string()),
        region: v.optional(v.string()),
        language: v.optional(v.string()),
        // Step 1: Business Profile Basics
        ssmNumber: v.optional(v.string()),                // SSM registration number
        businessType: v.optional(v.string()),             // "manufacturing" | "retail" | "services" | "agriculture" | "f&b" | "other"
        sector: v.optional(v.string()),                   // Legacy field — kept for compatibility
        yearsOperating: v.optional(v.number()),           // 0–10+ slider
        annualTurnover: v.optional(v.number()),           // RM estimate
        businessSize: v.optional(v.string()),             // "micro" | "small" | "medium" (auto-categorized per BNM)
        // Step 2: Loan & Projection Details
        loanPurpose: v.optional(v.string()),              // "working_capital" | "expansion" | "equipment" | "inventory" | "other"
        projectedRevenue12m: v.optional(v.number()),      // Next 12 months estimate (RM)
        assetList: v.optional(v.array(v.object({          // For Collateral simulation
            type: v.string(),                             // "property" | "vehicle" | "inventory" | "equipment" | "other"
            description: v.string(),
            estimatedValue: v.number(),
        }))),
        // Step 3: Financial Uploads & Consent
        ssmRegistered: v.optional(v.boolean()),
        crossBorderIntent: v.optional(v.boolean()),
        creditReportConsent: v.optional(v.boolean()),     // CCRIS/CTOS consent
        onboardingComplete: v.optional(v.boolean()),
        tier: v.optional(v.string()),                     // "incubator" | "formalized"
        // Bank statement analysis results
        bankData: v.optional(v.object({
            adb: v.number(),                              // Average Daily Balance
            amb: v.optional(v.number()),                  // Average Monthly Balance
            dsr: v.number(),                              // Debt Service Ratio %
            volatility: v.number(),                       // Income volatility 0-100
            monthsAnalyzed: v.optional(v.number()),       // How many months covered
            extractedAt: v.number(),                      // Timestamp
            // Extended metrics (Phase 2 dashboard)
            monthlyInflow: v.optional(v.number()),        // Avg monthly credits
            monthlyOutflow: v.optional(v.number()),       // Avg monthly debits
            bounceCount: v.optional(v.number()),          // Bounced/failed transactions
            lowestBalance: v.optional(v.number()),        // Minimum balance recorded
            netCashFlow: v.optional(v.number()),          // Avg monthly net flow
            dscr: v.optional(v.number()),                 // Debt Service Coverage Ratio (x)
            expenseRatio: v.optional(v.number()),         // (debits/credits)*100
            overdraftCount: v.optional(v.number()),       // Count of negative balances
            revenueConsistency: v.optional(v.number()),   // StdDev/Mean of credits (%)
            avgMonthlyBalance: v.optional(v.number()),    // Mean of monthly avg balances
        })),
        proxyScore: v.optional(v.number()),               // 300-850
        // Pre-screening verdict
        eligibilityVerdict: v.optional(v.string()),       // "eligible" | "not_eligible"
        eligibilityProbability: v.optional(v.number()),   // 0-100
        eligibilityWeaknesses: v.optional(v.array(v.string())),
        // Audit results (State B dashboard)
        auditStatus: v.optional(v.string()),              // "Eligible" | "Borderline – Needs Improvement" | "Not Eligible"
        auditColor: v.optional(v.string()),               // "green" | "amber" | "red"
        auditDate: v.optional(v.string()),                // "Mar 06, 2026"
        strategicSummary: v.optional(v.string()),         // AI-generated 1-sentence summary
        eligibilityIndex: v.optional(v.number()),         // 0-100 (AI-weighted)
        riskClassification: v.optional(v.string()),       // "LOW RISK" | "MODERATE RISK" | "HIGH RISK"
        auditWeaknesses: v.optional(v.array(v.object({    // Prioritized weaknesses
            title: v.string(),
            description: v.string(),
            dragPct: v.number(),
        }))),
        auditOptimizations: v.optional(v.array(v.object({ // Optimization pathways
            title: v.string(),
            steps: v.array(v.string()),
            targetWeakness: v.string(),
        }))),
        parseConfidence: v.optional(v.string()),          // "full" | "partial" | "low"
        createdAt: v.number(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_phone", ["phoneNumber"]),

    // Shadow-Ledger entries — financial data extracted from receipts
    shadow_ledgers: defineTable({
        clerkId: v.string(),
        source: v.optional(v.string()), // "web" | "whatsapp"
        rawText: v.string(),
        classification: v.string(), // PAYMENT_IN | ORDER_IN | COMPLAINT
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

    // Product listings — bilingual e-commerce listings
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

    // Export query logs — tracks Sol3 compliance searches for predictive analytics
    export_queries: defineTable({
        clerkId: v.string(),
        product: v.string(),
        destination: v.string(),
        status: v.string(), // green | yellow | red
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
        dimensions: 384, // all-MiniLM-L6-v2 outputs 384-dim vectors
        filterFields: ["category"],
    }),

    // Ad projects — video ad generation pipeline (Phase 4)
    ad_projects: defineTable({
        clerkId: v.string(),
        listingId: v.optional(v.id("product_listings")),
        status: v.string(),      // "pending" | "processing" | "complete" | "failed"
        scriptText: v.optional(v.string()),
        storyboard: v.optional(v.string()),
        videoStorageId: v.optional(v.id("_storage")),
        videoDuration: v.optional(v.number()),
        platform: v.optional(v.string()),
        caption: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_clerk_id", ["clerkId"]),
});
