import { mutation } from "./_generated/server";

/**
 * One-time migration: Move financial/audit data from `profiles` → `dashboard`.
 * Run this ONCE after deploying the intermediate schema, then deploy the final schema.
 *
 * Usage: Call `admin.migrateProfilesToDashboard` from the Convex dashboard or CLI.
 */
export const migrateProfilesToDashboard = mutation({
    args: {},
    handler: async (ctx) => {
        const allProfiles = await ctx.db.query("profiles").collect();
        let migrated = 0;
        let skipped = 0;

        for (const profile of allProfiles) {
            // Only migrate profiles that have financial data
            const hasBankData = (profile as any).bankData !== undefined;
            const hasProxyScore = (profile as any).proxyScore !== undefined;

            if (!hasBankData && !hasProxyScore) {
                skipped++;
                continue;
            }

            // Check if dashboard record already exists
            const existingDashboard = await ctx.db
                .query("dashboard")
                .withIndex("by_clerk_id", (q) => q.eq("clerkId", profile.clerkId))
                .first();

            if (existingDashboard) {
                skipped++;
                continue;
            }

            // Create dashboard record with financial fields from profile
            const p = profile as any;
            await ctx.db.insert("dashboard", {
                clerkId: profile.clerkId,
                bankData: p.bankData,
                proxyScore: p.proxyScore,
                eligibilityVerdict: p.eligibilityVerdict,
                eligibilityProbability: p.eligibilityProbability,
                eligibilityWeaknesses: p.eligibilityWeaknesses,
                auditStatus: p.auditStatus,
                auditColor: p.auditColor,
                auditDate: p.auditDate,
                strategicSummary: p.strategicSummary,
                eligibilityIndex: p.eligibilityIndex,
                riskClassification: p.riskClassification,
                auditWeaknesses: p.auditWeaknesses,
                auditOptimizations: p.auditOptimizations,
                parseConfidence: p.parseConfidence,
                createdAt: Date.now(),
            });

            // Strip financial fields from profile by replacing the document
            await ctx.db.replace(profile._id, {
                clerkId: profile.clerkId,
                phoneNumber: profile.phoneNumber,
                businessName: profile.businessName,
                region: profile.region,
                language: profile.language,
                ssmNumber: (profile as any).ssmNumber,
                businessType: (profile as any).businessType,
                sector: (profile as any).sector,
                yearsOperating: (profile as any).yearsOperating,
                annualTurnover: (profile as any).annualTurnover,
                businessSize: (profile as any).businessSize,
                loanPurpose: (profile as any).loanPurpose,
                projectedRevenue12m: (profile as any).projectedRevenue12m,
                assetList: (profile as any).assetList,
                ssmRegistered: (profile as any).ssmRegistered,
                crossBorderIntent: (profile as any).crossBorderIntent,
                creditReportConsent: (profile as any).creditReportConsent,
                onboardingComplete: (profile as any).onboardingComplete,
                tier: (profile as any).tier,
                createdAt: profile.createdAt,
            });

            migrated++;
        }

        return {
            status: "success",
            message: `Migration complete: ${migrated} profiles migrated, ${skipped} skipped`,
            migrated,
            skipped,
            total: allProfiles.length,
        };
    },
});
