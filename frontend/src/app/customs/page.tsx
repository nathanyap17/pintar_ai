"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import Globe from "@/components/Globe";
import { GlitchText } from "@/components/GlitchText";
import {
    ShieldAlert,
    AlertTriangle,
    Brain,
    Link as LinkIcon,
    TrendingUp,
    DollarSign,
    CheckCircle2,
    Loader2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLE_PRODUCTS = [
    "10kg Bario Rice",
    "5kg Sarawak Black Pepper",
    "Rattan baskets (bakul)",
    "Pua Kumbu woven textiles",
    "Belacan & Laksa Paste",
    "Durian kampung",
];

/* ── Types matching backend assess_compliance_fused return ── */
interface Barrier {
    type: string;
    description: string;
    severity: string;
    mitigation?: string;
}

interface FusionResult {
    friction_score: number;
    friction_level: string;
    barriers: Barrier[];
    logistics: {
        freight_index: number;
        trend: string;
        trend_pct: number;
        avg_days: number;
        cost_per_kg_myr: number;
        cost_impact: string;
    };
    defa_compliance: {
        status: string;
        summary: string;
        requirements: string[];
        de_minimis: string;
        hs_code: string;
        estimated_duties: string;
    };
    financial_feasibility: {
        cash_available_myr: number;
        estimated_export_cost_myr: number;
        can_absorb: boolean;
        ratio_pct: number;
    };
    strategic_verdict: string;
    warnings: string[];
    destination: string;
    sources_used: number;
    web_grounded?: boolean;
    grounding_sources?: { title: string; uri: string }[];
}

const CHAMFER = "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)";
const CHAMFER_SM = "polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)";

/* ── Skeleton Card Component ── */
function SkeletonCard({ lines = 3, accent = "primary" }: { lines?: number; accent?: string }) {
    return (
        <div className="cyber-panel p-6 lg:p-8">
            <div className={`h-3 skeleton-bone${accent === 'secondary' ? '-secondary' : ''} w-1/3 mb-4`}></div>
            <div className="space-y-3">
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className={`h-2 skeleton-bone${accent === 'secondary' ? '-secondary' : ''}`} style={{ width: `${100 - i * 15}%` }}></div>
                ))}
            </div>
        </div>
    );
}

export default function CustomsPage() {
    const { user } = useUser();
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [product, setProduct] = useState(SAMPLE_PRODUCTS[0]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FusionResult | null>(null);
    const [error, setError] = useState("");

    const handleCountrySelect = async (country: string) => {
        setSelectedCountry(country);
        setError("");
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/compliance/analyze`, {
                product,
                origin: "Sarawak",
                destination: country,
                clerk_id: user?.id || "",
            });
            setResult(res.data);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(
                detail
                    ? `Analysis failed: ${detail}`
                    : err?.message || "Cannot reach backend. Is it running?"
            );
        } finally {
            setLoading(false);
        }
    };

    const frictionScore = result?.friction_score ?? 0;
    const frictionLevel = result?.friction_level ?? "—";

    return (
        <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10 lg:px-16 bg-background">
            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-7xl flex flex-col items-center">
                {/* Title */}
                <div className="mb-6 text-center w-full relative py-4">
                    <div className="scanlines-overlay"></div>
                    <div className="relative z-10">
                        <h1 className="font-heading text-5xl md:text-6xl text-white glitch-text tracking-[0.4em] opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            COMPLIANCE SENTINEL
                        </h1>
                        <p className="text-[10px] tracking-[0.3em] text-primary font-bold uppercase">
                            Global Trade Monitoring & Real-time Risk Assessment
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="w-full max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center  uppercase" style={{ clipPath: CHAMFER }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* ─── 3-Column Grid: Left | Globe | Right ─── */}
                <div className="relative w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ─── LEFT PANEL ─── */}
                    <div className="lg:col-span-3 flex flex-col gap-6 z-20">

                        {/* Product Selector */}
                        <div className="cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[120px]">
                            <label className="block text-[10px] text-primary/70 uppercase tracking-wider mb-2  font-bold">Select Commodity</label>
                            <select
                                className="w-full bg-background border border-primary/30 text-white text-xs  px-3 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                                style={{ clipPath: CHAMFER_SM }}
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                            >
                                {SAMPLE_PRODUCTS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {loading ? (
                            <>
                                <SkeletonCard lines={4} />
                                <SkeletonCard lines={3} />
                            </>
                        ) : (
                            <>
                                {/* Friction Analysis Card */}
                                <div className="cyber-panel p-6 lg:p-8 border-l-4 border-l-primary flex flex-col justify-center min-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ boxShadow: '0 0 15px rgba(0,243,255,0.2)' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <ShieldAlert className="text-primary h-5 w-5" />
                                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider ">Friction Analysis</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-primary/70 ">Friction Score</span>
                                            <span className="text-3xl font-black text-primary neon-text-cyan tabular-nums transform scale-y-[1.15] tracking-tight inline-block">
                                                {result ? frictionScore : "—"}
                                                <span className="text-sm text-primary/50  tracking-normal transform-none inline-block ml-1">/100</span>
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-primary/10 overflow-hidden border border-primary/30">
                                            <div
                                                className={`h-full transition-all duration-700 ${frictionScore > 60 ? 'bg-destructive' : frictionScore > 30 ? 'bg-amber-400' : 'bg-primary'}`}
                                                style={{ width: result ? `${frictionScore}%` : '0%' }}
                                            ></div>
                                        </div>
                                        <p
                                            className="text-xs text-white  bg-primary/20 py-1.5 px-3 border border-primary/50 inline-block"
                                            style={{ clipPath: CHAMFER }}
                                        >
                                            Friction Level:{" "}
                                            <span className={`font-bold ${frictionScore > 60 ? 'text-destructive' : frictionScore > 30 ? 'text-amber-400' : 'text-primary'}`}>
                                                {result ? frictionLevel.toUpperCase() : "AWAITING"}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Barrier Alerts Card */}
                                <div className="cyber-panel p-6 lg:p-8 flex flex-col min-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <h3 className="font-bold text-primary uppercase text-xs mb-4 tracking-wider  text-left">Barrier Alerts</h3>
                                    <ul className="space-y-4 text-xs text-primary/70 ">
                                        {result && result.barriers && result.barriers.length > 0 ? (
                                            result.barriers.map((b, i) => {
                                                const isSPS = b.type === "SPS";
                                                return (
                                                    <li
                                                        key={i}
                                                        className={`flex items-start gap-3 p-4 border ${isSPS ? 'bg-accent/5 border-accent/20' : 'bg-secondary/5 border-secondary/20'}`}
                                                        style={{ clipPath: CHAMFER }}
                                                    >
                                                        <AlertTriangle className={`h-4 w-4 ${isSPS ? 'text-accent' : 'text-secondary'} mt-0.5 shrink-0`} />
                                                        <div>
                                                            <span className={`font-bold ${isSPS ? 'text-accent' : 'text-secondary'} block mb-1 uppercase tracking-wider`}>
                                                                {b.type} ({b.type === "SPS" ? "Sanitary & Phytosanitary" : b.type === "TBT" ? "Technical Barriers to Trade" : b.type})
                                                            </span>
                                                            <span className="text-white/70">{b.description}</span>
                                                            {b.mitigation && (
                                                                <p className="text-primary/80 mt-2 pt-2 border-t border-primary/20">
                                                                    <span className="font-bold text-primary">FIX: </span>{b.mitigation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        ) : (
                                            <li className="p-4 text-center text-white/30 border border-white/10" style={{ clipPath: CHAMFER }}>
                                                {result ? "No barriers detected." : "Select a target to analyze."}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ─── CENTER: GLOBE ─── */}
                    <div className="lg:col-span-6 flex items-center justify-center relative min-h-[500px] lg:min-h-[700px]">
                        <Globe onSelectCountry={handleCountrySelect} analysisLoading={loading} selectedTarget={selectedCountry} />

                        {loading && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                                    <p className="text-xs text-primary  uppercase tracking-wider animate-pulse">
                                        Fusing Intelligence...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── RIGHT PANEL ─── */}
                    <div className="lg:col-span-3 flex flex-col gap-6 z-20">

                        {loading ? (
                            <>
                                <SkeletonCard lines={5} accent="secondary" />
                                <SkeletonCard lines={2} accent="secondary" />
                            </>
                        ) : (
                            <>
                                {/* Strategic Verdict */}
                                <div className="cyber-panel p-6 lg:p-8 border-l-4 border-l-secondary flex flex-col min-h-[540px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ boxShadow: '0 0 15px rgba(255,0,255,0.2)' }}>
                                    <h3 className="font-bold text-secondary uppercase text-xs mb-4 tracking-wider  text-left">Strategic Verdict</h3>

                                    <div className="p-4 bg-secondary/10 border border-secondary/30 mb-4" style={{ clipPath: CHAMFER }}>
                                        {result ? (
                                            <>
                                                <p className="text-xs font-bold text-secondary mb-1  uppercase">
                                                    {frictionScore > 60 ? "PROCEED WITH CAUTION" : frictionScore > 30 ? "MODERATE FRICTION" : "CLEAR ROUTE"}
                                                </p>
                                                <p className="text-[11px] text-white/80 leading-snug ">
                                                    {result.strategic_verdict}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-[11px] text-white/40  text-center uppercase">Awaiting analysis data...</p>
                                        )}
                                    </div>

                                    <div className="space-y-3 mt-4">
                                        {/* Logistics Trends */}
                                        <div className="flex items-start gap-3 bg-primary/5 p-4 border border-primary/20" style={{ clipPath: CHAMFER }}>
                                            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] text-primary/70 uppercase tracking-wider block mb-1  font-bold">Logistics Trends</span>
                                                {result ? (
                                                    <span className="text-xs text-white/90 ">
                                                        Transit: {result.logistics.avg_days} days · RM {result.logistics.cost_per_kg_myr}/kg · Freight {result.logistics.trend === 'rising' ? '▲' : result.logistics.trend === 'falling' ? '▼' : '●'} {Math.abs(result.logistics.trend_pct)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-white/40 ">—</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial Feasibility */}
                                        <div className="flex items-start gap-3 bg-primary/5 p-4 border border-primary/20" style={{ clipPath: CHAMFER }}>
                                            <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] text-primary/70 uppercase tracking-wider block mb-1  font-bold">Financial Feasibility</span>
                                                {result?.financial_feasibility ? (
                                                    <span className="text-xs text-white/90 ">
                                                        {result.financial_feasibility.can_absorb
                                                            ? `✅ Cashflow supports (${result.financial_feasibility.ratio_pct}% of reserves)`
                                                            : `⚠️ Margin impact: -${result.financial_feasibility.ratio_pct}% cost ratio`}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-white/40 ">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Web Grounded Card */}
                                <div className="cyber-panel p-6 lg:p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Brain className="text-secondary h-4 w-4" />
                                            <h3 className="font-bold text-secondary uppercase text-xs tracking-wider ">Web Grounded</h3>
                                        </div>
                                        <div
                                            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border ${result?.web_grounded
                                                ? "bg-primary/20 text-primary border-primary/50"
                                                : "bg-white/5 text-white/40 border-white/20"
                                                }`}
                                            style={{ clipPath: CHAMFER_SM }}
                                        >
                                            <CheckCircle2 className="h-3 w-3" />
                                            {result?.web_grounded ? "TRUE" : "—"}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] text-primary/50 uppercase tracking-wider mb-2  text-left">Grounding Sources</p>
                                        {result?.grounding_sources && result.grounding_sources.length > 0 ? (
                                            result.grounding_sources.map((src, i) => (
                                                <a
                                                    key={i}
                                                    href={src.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary transition-colors bg-primary/5 p-3 border border-primary/20 hover:border-primary/50"
                                                    style={{ clipPath: CHAMFER }}
                                                >
                                                    <LinkIcon className="h-3 w-3 shrink-0" />
                                                    <span className="truncate ">{src.title || src.uri}</span>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="text-xs text-white/30  text-center p-4 border border-white/10" style={{ clipPath: CHAMFER }}>
                                                {result ? "No external sources found." : "Sources appear after analysis."}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Warnings */}
                                {result?.warnings && result.warnings.length > 0 && (
                                    <div className="cyber-panel p-5 border-l-4 border-l-destructive">
                                        <h3 className="font-bold text-destructive uppercase text-[10px] tracking-wider  mb-3 flex items-center gap-2 text-left">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Warnings
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {result.warnings.map((w, i) => (
                                                <li key={i} className="text-[10px] text-white/70 ">• {w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
