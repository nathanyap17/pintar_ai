"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
    CheckCircle2, AlertTriangle, Info, TrendingUp, TrendingDown,
    Activity, ShieldAlert, ExternalLink, ArrowRight, BarChart3,
    PieChart, AlertCircle
} from 'lucide-react';
import { GlitchText } from "../../components/GlitchText";
import OnboardingModal from "../../components/OnboardingModal";

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const profile = useQuery(api.profiles.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
    const dashboardData = useQuery(api.dashboard.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
    const resetOnboarding = useMutation(api.profiles.resetOnboarding);

    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (profile !== undefined && !profile?.onboardingComplete) {
            setShowOnboarding(true);
        }
    }, [profile]);

    if (!isLoaded || profile === undefined || dashboardData === undefined) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
                <Activity className="h-10 w-10 text-primary animate-pulse" />
                <p className="text-primary mt-4  uppercase tracking-wider">Initializing Audit Stream...</p>
            </div>
        );
    }

    const hasAudit = dashboardData?.bankData && dashboardData?.proxyScore;
    const bankData = (dashboardData?.bankData ?? null) as {
        netCashFlow?: number; dscr?: number; expenseRatio?: number;
        revenueConsistency?: number; adb?: number; overdraftCount?: number;
        monthlyInflow?: number; monthlyOutflow?: number; monthsAnalyzed?: number;
        bounceCount?: number; lowestBalance?: number; avgMonthlyBalance?: number;
        volatility?: number; dsr?: number; extractedAt?: number; amb?: number;
    } | null;
    const proxyScore = dashboardData?.proxyScore || 0;
    const auditColor = dashboardData?.auditColor || "amber";
    const strategicSummary = dashboardData?.strategicSummary || "Awaiting financial data injection. Please complete the onboarding process.";
    const eligibilityIndex = dashboardData?.eligibilityIndex ?? dashboardData?.eligibilityProbability ?? 0;

    // Derived values
    const safeNetCashFlow = bankData?.netCashFlow ?? ((bankData?.monthlyInflow ?? 0) - (bankData?.monthlyOutflow ?? 0));
    // DSCR = Net Operating Income / Debt Service (assuming RM5,000 base debt if unknown, matching backend)
    const safeDscr = bankData?.dscr ?? (safeNetCashFlow > 0 ? Number((safeNetCashFlow / 5000).toFixed(2)) : 0);
    const safeExpenseRatio = bankData?.expenseRatio ?? (bankData?.monthlyInflow && bankData.monthlyInflow > 0 ? Number(((bankData?.monthlyOutflow ?? 0) / bankData.monthlyInflow * 100).toFixed(1)) : 0);
    const safeRevConsistency = bankData?.revenueConsistency ?? (bankData?.volatility ?? 0) * 100;
    const safeAdb = bankData?.adb ?? 0;
    const safeOverdrafts = bankData?.overdraftCount ?? (bankData?.bounceCount ?? 0); // fallback to bounceCount for legacy data

    const riskClassification = dashboardData?.riskClassification || (
        proxyScore > 700 ? "LOW RISK" : proxyScore > 500 ? "FAIR RISK" : "HIGH RISK"
    );

    const totalInflows = (bankData?.monthlyInflow || 0) * (bankData?.monthsAnalyzed || 1);
    const totalOutflows = (bankData?.monthlyOutflow || 0) * (bankData?.monthsAnalyzed || 1);


    return (
        <main className="flex-1 flex flex-col items-center px-6 py-10 lg:px-16 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] rounded-full bg-primary/5 blur-[150px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-7xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 relative py-4">
                    <div className="scanlines-overlay"></div>
                    <div className="relative z-10">
                        <h1 className="font-heading text-5xl md:text-6xl text-white glitch-text tracking-[0.4em] opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] flex items-center gap-3">
                            <BarChart3 className="h-7 w-7 text-primary" />
                            PRE-SCREENING DASHBOARD
                        </h1>
                        <p className="text-[10px] tracking-[0.3em] text-primary font-bold uppercase">
                            {profile?.businessType || 'Undeclared'} — {profile?.region || 'Unknown Location'} — {profile?.yearsOperating || 0} Years Operating
                        </p>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        {hasAudit && (
                            <button onClick={async () => {
                                if (user?.id) await resetOnboarding({ clerkId: user.id });
                                setShowOnboarding(true);
                            }} className="px-6 py-2.5 cyber-button-secondary text-xs uppercase cursor-pointer  tracking-wider">
                                New Analysis
                            </button>
                        )}
                        {!hasAudit && (
                            <button onClick={() => setShowOnboarding(true)} className="px-6 py-2 cyber-button text-xs uppercase cursor-pointer">
                                Start Pre-Screening
                            </button>
                        )}
                    </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

                    {/* 1. Verdict & Strategic Context (Col Span 8) */}
                    <div className="md:col-span-8 cyber-panel p-8 flex flex-col justify-between">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Consolidated Verdict</h2>
                                <div className="flex items-center gap-3 group relative">
                                    <div className={`flex items-center gap-2 px-4 py-2 border ${auditColor === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' :
                                        auditColor === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/50' :
                                            'bg-amber-500/10 text-amber-400 border-amber-500/50'
                                        }`} style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                        {auditColor === 'green' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                        <span className={`font-black text-lg tracking-wider uppercase ${auditColor === 'green' ? 'neon-text-cyan' : auditColor === 'red' ? 'neon-text-red' : 'neon-text-accent'
                                            }`}>
                                            {dashboardData?.auditStatus || "Not Audited"}
                                        </span>
                                    </div>
                                    <div className="cursor-help text-slate-500 hover:text-white transition-colors">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute left-0 top-full mt-2 w-80 bg-background-dark border border-white/20 p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                        <h4 className="text-sm font-bold text-white mb-2 border-b border-white/10 pb-2">5C&apos;s of Credit Analysis</h4>
                                        <ul className="text-xs space-y-2 text-slate-300">
                                            {(dashboardData?.fiveCsAnalysis ?? [
                                                { label: "Character", color: (bankData?.bounceCount ?? 0) === 0 && safeOverdrafts === 0 ? "green" : "amber", summary: (bankData?.bounceCount ?? 0) === 0 && safeOverdrafts === 0 ? "Good history, no defaults." : `${bankData?.bounceCount ?? 0} bounce(s), ${safeOverdrafts} overdraft(s).` },
                                                { label: "Capacity", color: safeDscr >= 1.25 && safeNetCashFlow > 0 ? "green" : safeDscr >= 1.0 ? "amber" : "red", summary: safeNetCashFlow > 0 ? `Strong net positive cash flow. DSCR ${safeDscr}x.` : "Negative cash flow limits capacity." },
                                                { label: "Capital", color: safeAdb >= 10000 ? "green" : safeAdb >= 3000 ? "amber" : "red", summary: `RM${safeAdb.toLocaleString()} Average Daily Balance.` },
                                                { label: "Conditions", color: "amber", summary: "Sector conditions — upload data for analysis." },
                                                { label: "Collateral", color: "red", summary: "Insufficient hard assets — declare assets during onboarding." },
                                            ]).map((c, i) => (
                                                <li key={i}>
                                                    <strong className={c.color === "green" ? "text-emerald-400" : c.color === "amber" ? "text-amber-400" : "text-red-400"}>
                                                        {c.label}:
                                                    </strong>{" "}
                                                    {c.summary}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                                <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Eligibility Index</h2>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-white leading-none neon-text-cyan transform scale-y-[1.15] tracking-tight inline-block">{eligibilityIndex}</span>
                                    <span className="text-lg font-bold text-primary mb-1">%</span>
                                </div>
                                <div className="w-32 h-2 bg-primary/10 mt-2 overflow-hidden" style={{ clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)' }}>
                                    <div className="h-full bg-linear-to-r from-secondary via-accent to-primary" style={{ width: `${eligibilityIndex}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/30 p-4" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Strategic Summary</h3>
                            <p className="text-sm text-white font-medium leading-relaxed">
                                {strategicSummary}
                            </p>
                        </div>
                    </div>

                    {/* 2. Risk & Data Integrity (Col Span 4) */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        {/* Risk Gauge */}
                        <div className="cyber-panel p-6 lg:p-8 flex-1 flex flex-col items-center justify-center relative group">
                            <h2 className="absolute top-6 left-6 text-xs font-bold text-primary uppercase tracking-wider">Proxy CTOS Score</h2>

                            <div className="relative w-40 h-40 mt-4">
                                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round" />
                                    <path d="M 10 50 A 40 40 0 0 1 70 15" fill="none" stroke={proxyScore > 700 ? "#00ff88" : proxyScore > 500 ? "#f59e0b" : "#ff3366"} strokeWidth="10" strokeLinecap="round" strokeDasharray="125" strokeDashoffset={`${125 - (Math.min(proxyScore, 850) / 850 * 125)}`} />
                                </svg>
                                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                                    <span className="text-3xl font-heading font-bold text-white">{proxyScore}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${proxyScore > 700 ? 'text-primary' : proxyScore > 500 ? 'text-amber-400' : 'text-red-400'}`}>{riskClassification}</span>
                                </div>
                            </div>

                            <button className="mt-4 text-xs text-primary hover:text-primary/80 font-bold flex items-center gap-1 transition-colors cursor-pointer">
                                View Score Breakdown <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>

                        {/* Data Quality */}
                        <div className="cyber-panel p-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Data Integrity</h2>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 animate-pulse ${dashboardData?.parseConfidence === 'low' ? 'bg-amber-400' : 'bg-primary'}`} style={{ boxShadow: '0 0 10px #00f3ff' }}></div>
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                                        {dashboardData?.parseConfidence === "low" ? "Limited Data" : dashboardData?.parseConfidence === "partial" ? "Partial Match" : "Full Confidence"}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-heading font-bold text-white">{bankData?.monthsAnalyzed || 0}</span>
                                <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider block ">Months Analyzed</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Core KPI Matrix (Col Span 12) */}
                    <div className="md:col-span-12">
                        <h2 className="text-sm font-black text-primary uppercase tracking-wider mb-4 flex items-center gap-2 ">
                            <PieChart className="h-4 w-4 text-primary" /> Core KPI Matrix
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                            {/* KPI 1 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeNetCashFlow >= 5000 ? 'border-primary/50 hover:border-primary' : safeNetCashFlow >= 0 ? 'border-amber-500/50 hover:border-amber-500' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">Net Cash Flow</h3>
                                    {safeNetCashFlow >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">RM {(safeNetCashFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                <p className="text-[10px] text-primary font-bold mt-2  w-full text-left">Target: &gt;RM5k</p>
                            </div>

                            {/* KPI 2 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeDscr >= 1.25 ? 'border-primary/50 hover:border-primary' : safeDscr >= 1.0 ? 'border-accent/50 hover:border-accent' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-accent uppercase tracking-wider">DSCR</h3>
                                    <AlertCircle className="h-4 w-4 text-accent" />
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">{safeDscr.toFixed(1)}x</p>
                                <p className="text-[10px] text-accent font-bold mt-2  w-full text-left">Target: &gt;1.25x</p>
                            </div>

                            {/* KPI 3 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeExpenseRatio < 60 ? 'border-primary/50 hover:border-primary' : safeExpenseRatio < 70 ? 'border-violet-500/50 hover:border-violet-500' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Expense Ratio</h3>
                                    {safeExpenseRatio < 70 ? <TrendingDown className="h-4 w-4 text-violet-400" /> : <TrendingUp className="h-4 w-4 text-red-400" />}
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">{safeExpenseRatio}%</p>
                                <p className="text-[10px] text-violet-400 font-bold mt-2  w-full text-left">Target: &lt;70%</p>
                            </div>

                            {/* KPI 4 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeRevConsistency <= 15 ? 'border-primary/50 hover:border-primary' : safeRevConsistency <= 30 ? 'border-accent/50 hover:border-accent' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-accent uppercase tracking-wider">Rev. Consistency</h3>
                                    <Activity className="h-4 w-4 text-accent" />
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">{safeRevConsistency <= 15 ? "High" : safeRevConsistency <= 30 ? "Moderate" : "Low"}</p>
                                <p className="text-[10px] text-accent/80 font-bold mt-2  w-full text-left">{safeRevConsistency}% variance</p>
                            </div>

                            {/* KPI 5 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeAdb >= 15000 ? 'border-primary/50 hover:border-primary' : safeAdb >= 5000 ? 'border-secondary/50 hover:border-secondary' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wider">Avg. Balance</h3>
                                    {safeAdb >= 15000 ? <TrendingUp className="h-4 w-4 text-secondary" /> : <TrendingDown className="h-4 w-4 text-secondary" />}
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">RM {(safeAdb).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                <p className="text-[10px] text-secondary font-bold mt-2  w-full text-left">Floor: RM 15k</p>
                            </div>

                            {/* KPI 6 */}
                            <div className={`cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors group relative ${safeOverdrafts === 0 ? 'border-primary/50 hover:border-primary' : 'border-red-500/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">Overdrafts</h3>
                                    {safeOverdrafts === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                                </div>
                                <p className="text-xl font-heading font-bold text-white w-full text-left mt-2">{safeOverdrafts}</p>
                                <p className="text-[10px] text-primary font-bold mt-2  w-full text-left">Last {bankData?.monthsAnalyzed || 6} months</p>
                            </div>

                        </div>
                    </div>

                    {/* 4. Diagnostic & Improvement (Col Span 12) */}
                    <div className="md:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Statement Summary Box */}
                        <div className="cyber-panel p-6 lg:p-8 flex flex-col min-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Summary ({bankData?.monthsAnalyzed || 1}M)</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                                    <span className="text-sm text-white  uppercase">Total Inflows</span>
                                    <span className="text-sm font-bold text-primary">RM {totalInflows.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                                    <span className="text-sm text-white  uppercase">Total Outflows</span>
                                    <span className="text-sm font-bold text-secondary">RM {totalOutflows.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 mt-auto">
                                    <span className="text-sm font-bold text-white  uppercase mt-2">Net Position</span>
                                    <span className={`text-xl font-black transform scale-y-[1.15] tracking-tight inline-block ${(totalInflows - totalOutflows) >= 0 ? "text-white neon-text-cyan" : "text-red-400 neon-text-red"}`}>RM {(totalInflows - totalOutflows).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Prioritized Weaknesses */}
                        <div className="cyber-panel p-6 lg:p-8 border-secondary/50 flex flex-col min-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 flex items-center gap-2 ">
                                <ShieldAlert className="h-4 w-4 text-secondary" /> Drag Factors
                            </h3>
                            <div className="space-y-3">
                                {(dashboardData?.auditWeaknesses || []).map((weakness, i) => (
                                    <div key={i} className="bg-secondary/10 border border-secondary/30 p-3 flex items-start gap-3" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                        <div className="mt-0.5 h-2 w-2 bg-secondary shadow-[0_0_10px_#ff00ff]"></div>
                                        <div>
                                            <p className="text-sm font-bold text-white uppercase tracking-wider">{weakness.title} (-{weakness.dragPct}%)</p>
                                            <p className="text-xs text-secondary/80 mt-1 ">{weakness.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!dashboardData?.auditWeaknesses || dashboardData?.auditWeaknesses.length === 0) && (
                                    <div className="text-sm text-white/50 italic">No drag factors identified yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Improvement Cards */}
                        <div className="cyber-panel p-6 lg:p-8 flex flex-col min-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Actionable Steps</h3>
                            <div className="space-y-3">
                                {(dashboardData?.auditOptimizations || []).map((opt, i) => (
                                    <div key={i} className="block bg-primary/5 hover:bg-primary/10 border border-primary/30 p-3 transition-colors group cursor-pointer" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider">{opt.title}</p>
                                            <ExternalLink className="h-3 w-3 text-primary/50 group-hover:text-primary" />
                                        </div>
                                        <p className="text-xs text-primary/70 ">{opt.steps[0] || "Execute recommended mitigation strategies."}</p>
                                    </div>
                                ))}
                                {(!dashboardData?.auditOptimizations || dashboardData?.auditOptimizations.length === 0) && (
                                    <div className="block bg-primary/5 border border-primary/30 p-3" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                        <div className="text-sm text-white/50 italic">Run analysis to see actionable steps.</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        </main>
    );
}
