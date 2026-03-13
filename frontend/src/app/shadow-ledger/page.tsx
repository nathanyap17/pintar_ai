"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import axios from "axios";
import {
    UploadCloud, MessageSquare, Receipt, TrendingUp,
    Brain, Wallet, DollarSign, Calendar, ArrowUpRight,
    Smartphone, Image as ImageIcon, Zap, ShieldCheck,
    PauseCircle, PlayCircle, Activity, RotateCcw, AlertTriangle, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { GlitchText } from "@/components/GlitchText";
import LinkDevice from "@/components/LinkDevice";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEMO_CLERK_ID = process.env.NEXT_PUBLIC_DEMO_CLERK_ID || "user_3AHz3NhmKaA32EFd5T3Sz4F28N9";

interface PredictiveData {
    predicted_30d_revenue_myr: number;
    current_month_revenue_myr: number;
    growth_indicator: string;
    mom_growth_pct: number;
    export_readiness_score: number;
    total_revenue_myr: number;
    total_orders: number;
    total_complaints: number;
    total_entries: number;
    avg_sentiment: number;
    target_markets: string[];
    market_trend_analysis: string;
    strategic_advice: string[];
}

const CHAMFER = "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)";

function SkeletonBlock({ w = "w-full", h = "h-3", className = "" }: { w?: string; h?: string; className?: string }) {
    return <div className={`skeleton-bone ${w} ${h} ${className}`}></div>;
}

export default function ShadowLedgerPage() {
    const { user, isLoaded } = useUser();
    const clerkId = user?.id ?? "";
    const isDemoAccount = clerkId === DEMO_CLERK_ID;

    // --- Convex Real-time Ledger Data ---
    const history = useQuery(api.ledgers.getByUser, clerkId ? { clerkId, limit: 10 } : "skip");
    const profile = useQuery(api.profiles.getByClerkId, clerkId ? { clerkId } : "skip");
    const heatmapRaw = useQuery(api.ledgers.getHeatmapData, clerkId ? { clerkId } : "skip");
    const deleteAll = useMutation(api.ledgers.deleteAllByUser);

    // --- Predictive AI Data ---
    const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null);
    const [loadingPredictions, setLoadingPredictions] = useState(false);

    // --- Manual Upload State ---
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- UI State ---
    const [isDragging, setIsDragging] = useState(false);
    const [isFrozen, setIsFrozen] = useState(false);

    // --- Factory Reset State ---
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetInput, setResetInput] = useState("");
    const [resetting, setResetting] = useState(false);

    // --- Heatmap hover ---
    const [hoveredTile, setHoveredTile] = useState<number | null>(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            if (!user) return;
            setLoadingPredictions(true);
            try {
                const response = await fetch(`${API_URL}/api/predictive/insights`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clerk_id: user.id }),
                });
                if (response.ok) {
                    const result = await response.json();
                    setPredictiveData(result);
                }
            } catch (err) {
                console.error("Predictive fetch failed:", err);
            } finally {
                setLoadingPredictions(false);
            }
        };

        if (user) fetchPredictions();
    }, [user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file || !clerkId) return;

        setLoadingUpload(true);
        setUploadError("");
        setUploadResult(null);

        const formData = new FormData();
        formData.append("image", file);
        formData.append("msme_id", clerkId);

        try {
            const res = await axios.post(`${API_URL}/api/ledger/analyze`, formData);
            setUploadResult(res.data);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err: any) {
            setUploadError(err?.response?.data?.detail || err?.message || "Analysis failed.");
        } finally {
            setLoadingUpload(false);
        }
    };

    const handleFactoryReset = async () => {
        if (resetInput !== "RESET" || !clerkId) return;
        setResetting(true);
        try {
            await deleteAll({ clerkId });
            setPredictiveData(null);
            setUploadResult(null);
        } catch (err) {
            console.error("Reset failed:", err);
        } finally {
            setResetting(false);
            setShowResetModal(false);
            setResetInput("");
        }
    };

    // --- Heatmap: Real data from Convex, current month view ---
    const heatmapDisplay = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

        const tiles: { day: number; income: number; orders: number; isPast: boolean; isToday: boolean; isFuture: boolean }[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEntry = heatmapRaw?.days?.find((h: any) => h.date === dateStr);

            tiles.push({
                day: d,
                income: dayEntry?.income ?? 0,
                orders: 0, // could be enriched later
                isPast: d < today,
                isToday: d === today,
                isFuture: d > today,
            });
        }

        return { tiles, firstDayOfWeek, monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    }, [heatmapRaw]);

    const getHeatmapColor = (income: number, isPast: boolean, isToday: boolean) => {
        if (isToday) return 'bg-secondary/60 border-secondary shadow-[0_0_10px_rgba(255,0,255,0.4)]';
        if (income <= 0 && isPast) return 'bg-white/5 border-white/10 opacity-30';
        if (income <= 0) return 'bg-white/5 border-white/10';
        const max = heatmapRaw?.maxIncome ?? 1;
        const ratio = income / max;
        if (ratio > 0.75) return 'bg-primary border-primary shadow-[0_0_8px_rgba(0,255,136,0.5)]';
        if (ratio > 0.5) return 'bg-primary/70 border-primary/80';
        if (ratio > 0.25) return 'bg-primary/40 border-primary/50';
        return 'bg-primary/20 border-primary/30';
    };

    // Detect if user has started (has ledger entries)
    const hasStarted = !!(history && history.length > 0);

    // Projection chart data
    const projectionData = useMemo(() => {
        const finalTarget = predictiveData?.predicted_30d_revenue_myr || 5100;
        const currentTarget = predictiveData?.current_month_revenue_myr || 4250;

        return [
            { day: '1', actual: currentTarget * 0.1, projected: finalTarget * 0.1 },
            { day: '5', actual: currentTarget * 0.3, projected: finalTarget * 0.25 },
            { day: '10', actual: currentTarget * 0.5, projected: finalTarget * 0.45 },
            { day: '15', actual: currentTarget * 0.8, projected: finalTarget * 0.65 },
            { day: '20', actual: currentTarget, projected: finalTarget * 0.8 },
            { day: '25', actual: null, projected: finalTarget * 0.9 },
            { day: '30', actual: null, projected: finalTarget },
        ];
    }, [predictiveData]);

    if (!isLoaded) return <div className="flex-1 flex items-center justify-center min-h-[500px]"><Activity className="animate-spin text-primary h-8 w-8" /></div>;

    const currentRevenue = predictiveData?.current_month_revenue_myr || 0;
    const predictedRevenue = predictiveData?.predicted_30d_revenue_myr || 0;
    const momGrowth = predictiveData?.mom_growth_pct || 0;
    const assetsValue = profile?.assetList?.reduce((acc: number, val: any) => acc + (val.estimatedValue || 0), 0) || 0;

    return (
        <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10 lg:px-16">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-7xl flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 relative py-4">
                    <div className="scanlines-overlay"></div>
                    <div className="relative z-10">
                        <h1 className="font-heading text-5xl md:text-6xl text-white glitch-text tracking-[0.4em] opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            SHADOW LEDGER
                        </h1>
                        <p className="text-[10px] tracking-[0.3em] text-primary font-bold uppercase">Automated Cash Flow Analyzer for Unbanked MSMEs</p>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        {/* Factory Reset Button */}
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="flex items-center gap-2 px-4 py-2 border bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                            style={{ clipPath: CHAMFER }}
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider ">Reset</span>
                        </button>
                        <button
                            onClick={() => setIsFrozen(!isFrozen)}
                            className={`flex items-center gap-2 px-4 py-2 border transition-all cursor-pointer ${isFrozen
                                ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                : 'bg-secondary/10 border-secondary/50 text-secondary hover:bg-secondary/20 shadow-[0_0_10px_rgba(0,255,136,0.1)]'
                                }`}
                            style={{ clipPath: CHAMFER }}
                        >
                            {isFrozen ? <PauseCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            <span className="text-xs font-bold uppercase tracking-wider ">
                                {isFrozen ? 'Ledger Frozen' : 'AI Sync Active'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Factory Reset Confirmation Modal */}
                {showResetModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="cyber-panel p-8 w-full max-w-md border-t-4 border-t-destructive" style={{ background: 'rgba(5,5,5,0.98)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <h3 className="text-sm font-bold text-destructive uppercase tracking-wider ">Factory Reset</h3>
                                </div>
                                <button onClick={() => { setShowResetModal(false); setResetInput(""); }} className="text-white/40 hover:text-white cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-xs text-white/70  mb-4 leading-relaxed">
                                This will permanently delete ALL your Shadow Ledger entries. This action cannot be undone.
                            </p>
                            <label className="block text-[10px] text-destructive uppercase tracking-wider mb-2  font-bold">Type RESET to confirm</label>
                            <input
                                className="w-full bg-background border border-destructive/30 text-white text-sm  px-4 py-2.5 outline-none focus:border-destructive transition-colors mb-4"
                                style={{ clipPath: CHAMFER }}
                                value={resetInput}
                                onChange={(e) => setResetInput(e.target.value.toUpperCase())}
                                placeholder="RESET"
                            />
                            <button
                                onClick={handleFactoryReset}
                                disabled={resetInput !== "RESET" || resetting}
                                className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider  border transition-all ${resetInput === "RESET"
                                    ? 'bg-destructive/20 border-destructive text-destructive hover:bg-destructive/40 cursor-pointer'
                                    : 'bg-white/5 border-white/20 text-white/30 cursor-not-allowed'
                                    }`}
                                style={{ clipPath: CHAMFER }}
                            >
                                {resetting ? "Deleting..." : "Confirm Factory Reset"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loadingPredictions ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="cyber-panel p-6 lg:p-8">
                                <SkeletonBlock w="w-2/3" h="h-2" className="mb-3" />
                                <SkeletonBlock w="w-1/2" h="h-6" className="mb-2" />
                                <SkeletonBlock w="w-3/4" h="h-2" />
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="cyber-panel p-6 lg:p-8 border-t-2 border-t-primary flex flex-col justify-center min-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-xs text-primary/80 uppercase tracking-wider font-bold ">Gross Income (30d)</p>
                                    <DollarSign className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-white text-left relative mt-2 mb-1">{currentRevenue.toLocaleString()} <span className="text-sm text-primary/50  tracking-normal transform-none">MYR</span></h3>
                                <p className={`text-[10px] ${momGrowth >= 0 ? "text-primary" : "text-red-400"} mt-2 flex items-center gap-1 font-bold `}>
                                    <ArrowUpRight className="h-3 w-3" /> {momGrowth > 0 ? "+" : ""}{momGrowth.toFixed(1)}% vs last month
                                </p>
                            </div>

                            <div className="cyber-panel p-6 lg:p-8 border-t-2 border-t-secondary flex flex-col justify-center min-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-xs text-secondary/80 uppercase tracking-wider font-bold ">Total Transactions</p>
                                    <Wallet className="h-4 w-4 text-secondary" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-white text-left relative mt-2 mb-1">{predictiveData?.total_entries || 0} <span className="text-sm text-secondary/50  tracking-normal transform-none">Entries</span></h3>
                                <p className="text-[10px] text-secondary mt-2 flex items-center gap-1 font-bold ">Synced from WhatsApp / Statements</p>
                            </div>

                            <div className="cyber-panel p-6 lg:p-8 border-t-2 border-t-accent flex flex-col justify-center min-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-xs text-accent/80 uppercase tracking-wider font-bold ">Capital / Assets</p>
                                    <TrendingUp className="h-4 w-4 text-accent" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-white text-left relative mt-2 mb-1">{assetsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-accent/50  tracking-normal transform-none">MYR</span></h3>
                                <p className="text-[10px] text-accent/70 mt-2 ">Liquid cash & inventory value</p>
                            </div>

                            <div className="cyber-panel p-6 lg:p-8 border-t-2 border-t-violet-500 flex flex-col justify-center min-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ boxShadow: '0 0 15px rgba(176,38,255,0.3)' }}>
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-xs text-violet-400 uppercase tracking-wider font-bold ">Projected Revenue</p>
                                    <Zap className="h-4 w-4 text-violet-400" />
                                </div>
                                <h3 className="text-2xl font-black text-violet-400 neon-text-violet transform scale-y-[1.15] tracking-tight inline-block text-left relative mt-2 mb-1">{predictedRevenue.toLocaleString()} <span className="text-sm text-violet-400/50  tracking-normal transform-none">MYR</span></h3>
                                <p className="text-[10px] text-violet-400/80 mt-2 ">Expected next 30 days</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Middle Row: Heatmap & Input Canvas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 30-Day Heatmap & Daily List */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="cyber-panel p-6 lg:p-8 flex flex-col justify-center min-h-[440px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="font-bold text-primary uppercase text-xs tracking-wider flex items-center gap-2  text-left">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Income Heatmap — {heatmapDisplay.monthLabel}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] text-primary/60 ">
                                    <span>Less</span>
                                    <div className="flex gap-1">
                                        <div className="w-3 h-3 border bg-white/5 border-white/10 opacity-30"></div>
                                        <div className="w-3 h-3 border bg-primary/20 border-primary/30"></div>
                                        <div className="w-3 h-3 border bg-primary/40 border-primary/50"></div>
                                        <div className="w-3 h-3 border bg-primary/70 border-primary/80"></div>
                                        <div className="w-3 h-3 border bg-primary border-primary shadow-[0_0_8px_rgba(0,255,136,0.5)]"></div>
                                    </div>
                                    <span>More</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} className="text-center text-[10px] font-bold text-primary/50 uppercase tracking-wider mb-2 ">{day}</div>
                                ))}
                                {/* Empty cells for alignment */}
                                {Array.from({ length: (heatmapDisplay.firstDayOfWeek + 6) % 7 }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square"></div>
                                ))}
                                {heatmapDisplay.tiles.map((tile) => (
                                    tile.isFuture ? (
                                        <div key={tile.day} className="aspect-square"></div>
                                    ) : (
                                        <div
                                            key={tile.day}
                                            className={`aspect-square border transition-all hover:scale-110 cursor-pointer relative ${getHeatmapColor(tile.income, tile.isPast, tile.isToday)}`}
                                            onMouseEnter={() => setHoveredTile(tile.day)}
                                            onMouseLeave={() => setHoveredTile(null)}
                                        >
                                            {/* Hover tooltip */}
                                            {hoveredTile === tile.day && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap bg-background border border-primary/50 p-2 px-3  text-[10px] shadow-[0_0_10px_rgba(0,255,136,0.3)]" style={{ clipPath: CHAMFER }}>
                                                    <p className="text-white font-bold">Day {tile.day}</p>
                                                    <p className="text-primary">RM {tile.income.toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                        {/* Daily Income List */}
                        <div className="cyber-panel p-6 lg:p-8 flex flex-col min-h-[440px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <h3 className="font-bold text-primary uppercase text-xs tracking-wider mb-4  text-left">Today&apos;s Extracted Income</h3>
                            <div className="space-y-3">
                                {!history || history.length === 0 ? (
                                    <div className="p-6 text-center border border-primary/20 flex flex-col items-center gap-3" style={{ clipPath: CHAMFER }}>
                                        <UploadCloud className="h-8 w-8 text-primary/30" />
                                        <p className="text-primary/50 text-xs  uppercase tracking-wider">
                                            {hasStarted ? "No entries recorded yet." : "Upload your first income receipt to get started."}
                                        </p>
                                    </div>
                                ) : (
                                    history.slice(0, 5).map((tx: any) => (
                                        <div key={tx._id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 hover:border-primary/50 transition-colors" style={{ clipPath: CHAMFER }}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 flex items-center justify-center ${tx.classification === "PAYMENT_IN" ? "bg-primary/20" : tx.classification === "ORDER_IN" ? "bg-secondary/20" : "bg-red-500/20"}`}>
                                                    <Receipt className={`h-4 w-4 ${tx.classification === "PAYMENT_IN" ? "text-primary" : tx.classification === "ORDER_IN" ? "text-secondary" : "text-red-400"}`} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-wider">{tx.classification}</p>
                                                    <p className="text-[10px] text-primary/70 ">{tx.itemDescription}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${tx.classification.includes("IN") ? "text-primary neon-text-cyan" : "text-red-400 neon-text-red"}`}>
                                                    {tx.classification.includes("IN") ? "+" : "-"}RM {tx.amountMyr.toFixed(2)}
                                                </p>
                                                <p className="text-[10px] text-primary/50 ">{tx.transactionDate}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Input Canvas & Manual Overrides (Right Column) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* WhatsApp Link Shortcut */}
                        {!isDemoAccount && (
                            <LinkDevice />
                        )}

                        {uploadError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-xs text-center " style={{ clipPath: CHAMFER }}>
                                ❌ {uploadError}
                            </div>
                        )}

                        <div
                            className={`cyber-panel p-6 lg:p-8 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-primary/30 hover:border-primary'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: "none" }}
                            />
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-h-32 mb-4 border border-primary/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]" />
                            ) : (
                                <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mb-4 border border-primary" style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}>
                                    <UploadCloud className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <h3 className="font-bold text-white text-sm mb-2 uppercase tracking-wider">Drop Receipts & Chats</h3>
                            <p className="text-xs text-primary/60 mb-4 max-w-[200px] leading-relaxed ">
                                Upload WhatsApp screenshots or receipts to map into the Shadow Ledger via Agentic Extraction.
                            </p>

                            {imagePreview && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                                    disabled={loadingUpload}
                                    className="w-full py-2.5 cyber-button text-xs font-bold uppercase"
                                >
                                    {loadingUpload ? "Analyzing... Please Wait" : "Process Extracted Image"}
                                </button>
                            )}
                        </div>

                        {/* Upload Result Feedback */}
                        {uploadResult && (
                            <div className="cyber-panel p-5 bg-primary/10 border-primary">
                                <h4 className="text-[10px] font-bold text-primary uppercase mb-3 ">✅ Extracted Payload Sent</h4>
                                <div className="grid gap-2 text-xs  text-white/80">
                                    <div className="flex justify-between border-b border-primary/20 pb-1.5">
                                        <span>Amount:</span> <span className="text-secondary font-bold">RM {uploadResult.extracted_data?.amount_myr}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-primary/20 pb-1.5">
                                        <span>Class:</span> <span className="text-primary">{uploadResult.classification}</span>
                                    </div>
                                    <div className="flex justify-between pb-1">
                                        <span>Item:</span> <span>{uploadResult.extracted_data?.item}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Strategic Directives */}
                        <div className="cyber-panel p-6 lg:p-8 border-l-4 border-l-secondary" style={{ boxShadow: '0 0 15px rgba(255,0,255,0.2)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <Brain className="text-secondary h-5 w-5" />
                                <h3 className="font-bold text-secondary uppercase text-xs tracking-wider  text-left">AI Directives</h3>
                            </div>

                            <div className="space-y-4">
                                {loadingPredictions ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="p-3 border border-secondary/20" style={{ clipPath: CHAMFER }}>
                                            <SkeletonBlock w="w-1/3" h="h-2" className="skeleton-bone-secondary mb-2" />
                                            <SkeletonBlock w="w-full" h="h-2" className="skeleton-bone-secondary" />
                                        </div>
                                    ))
                                ) : predictiveData?.strategic_advice ? predictiveData.strategic_advice.map((advice, i) => (
                                    <div key={i} className={`p-4 border ${i % 2 === 0 ? 'bg-secondary/10 border-secondary/30' : 'bg-primary/5 border-primary/20'}`} style={{ clipPath: CHAMFER }}>
                                        <p className={`text-[10px] font-bold ${i % 2 === 0 ? 'text-secondary' : 'text-primary'} uppercase tracking-wider mb-1 `}>Insight #{i + 1}</p>
                                        <p className="text-xs text-white/80 leading-relaxed ">
                                            {advice}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="p-4 text-center border border-secondary/20" style={{ clipPath: CHAMFER }}>
                                        <p className="text-xs text-secondary/40  uppercase">No predictive data available yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Revenue Projection Area Chart */}
                <div className="cyber-panel p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-primary uppercase text-xs tracking-wider flex items-center gap-2  text-left">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            30-Day Revenue Projection Track
                        </h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider ">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-secondary shadow-[0_0_5px_#ff00ff]"></div> Actual</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-primary shadow-[0_0_5px_#00f3ff]"></div> Projected</div>
                        </div>
                    </div>

                    {!hasStarted && !predictiveData ? (
                        <div className="h-[250px] flex flex-col items-center justify-center border border-primary/20" style={{ clipPath: CHAMFER }}>
                            <UploadCloud className="h-10 w-10 text-primary/20 mb-3" />
                            <p className="text-xs text-primary/40  uppercase tracking-wider">Upload your first income receipt</p>
                            <p className="text-[10px] text-primary/30  mt-1">Revenue projections will appear here</p>
                        </div>
                    ) : (
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#ff00ff" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,243,255,0.1)" vertical={false} />
                                    <XAxis dataKey="day" stroke="rgba(0,243,255,0.5)" fontSize={10} tickMargin={10} fontFamily="monospace" />
                                    <YAxis stroke="rgba(0,243,255,0.5)" fontSize={10} tickFormatter={(value) => `${value}`} fontFamily="monospace" />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'rgba(5, 3, 10, 0.9)', borderColor: 'rgba(0, 243, 255, 0.3)', fontFamily: 'monospace', fontSize: '12px', color: '#fff' }}
                                        itemStyle={{ color: '#00f3ff' }}
                                    />
                                    <Area type="monotone" dataKey="projected" stroke="#00f3ff" strokeWidth={2} fillOpacity={1} fill="url(#colorProjected)" />
                                    <Area type="monotone" dataKey="actual" stroke="#ff00ff" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}
