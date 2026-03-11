"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

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

export default function PredictiveDashboard() {
    const { user } = useUser();
    const [data, setData] = useState<PredictiveData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Demo account gating — only this clerkId gets full predictions
    const DEMO_CLERK_ID = process.env.NEXT_PUBLIC_DEMO_CLERK_ID || "user_3AHz3NhmKaA32EFd5T3Sz4F28N9";
    const isDemoAccount = user?.id === DEMO_CLERK_ID;

    const fetchPredictions = async () => {
        if (!user) return;
        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/predictive/insights`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clerk_id: user.id }),
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            console.error("Predictive fetch failed:", err);
            setError("Could not load predictions. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchPredictions();
    }, [user]);

    // Loading state
    if (loading) {
        return (
            <div className="predictive-grid">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="predictive-card predictive-skeleton">
                        <div className="skeleton-line skeleton-title" />
                        <div className="skeleton-line skeleton-value" />
                        <div className="skeleton-line skeleton-text" />
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="predictive-error">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
                <button onClick={fetchPredictions} className="predictive-retry-btn">
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const growthPositive = data.mom_growth_pct >= 0;

    return (
        <div className="predictive-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div className="predictive-header">
                <div>
                    <h2 className="predictive-title">
                        <span className="material-symbols-outlined" style={{ color: "var(--accent-cyan)" }}>
                            insights
                        </span>
                        Neuro-Symbolic Predictions
                    </h2>
                    <p className="predictive-subtitle">
                        Math engine + Qwen 2.5 strategic analysis · Updated in real-time
                    </p>
                </div>
                <button onClick={fetchPredictions} className="predictive-refresh-btn" title="Refresh predictions">
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </div>

            <div className="predictive-grid">
                {/* Card 1: Revenue Prediction */}
                <div className="predictive-card predictive-revenue-card">
                    <div className="predictive-card-icon-bg">
                        <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.15 }}>
                            trending_up
                        </span>
                    </div>
                    <div className="predictive-card-label">Predicted 30-Day Revenue</div>
                    <div className="predictive-revenue-value">
                        RM {data.predicted_30d_revenue_myr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="predictive-growth-badge-row">
                        <span
                            className={`predictive-growth-badge ${growthPositive ? "growth-positive" : "growth-negative"}`}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {growthPositive ? "trending_up" : "trending_down"}
                            </span>
                            {data.growth_indicator} MoM
                        </span>
                        <span className="predictive-current-rev">
                            Current: RM {data.current_month_revenue_myr.toLocaleString()}
                        </span>
                    </div>
                    <div className="predictive-mini-stats">
                        <div>
                            <span className="predictive-mini-label">Orders</span>
                            <span className="predictive-mini-value">{data.total_orders}</span>
                        </div>
                        <div>
                            <span className="predictive-mini-label">Sentiment</span>
                            <span className="predictive-mini-value">{data.avg_sentiment}/10</span>
                        </div>
                        <div>
                            <span className="predictive-mini-label">Entries</span>
                            <span className="predictive-mini-value">{data.total_entries}</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Export Readiness */}
                <div className="predictive-card predictive-readiness-card">
                    <div className="predictive-card-top-row">
                        <div className="predictive-card-label">Export Readiness</div>
                        <span className="material-symbols-outlined" style={{ color: "var(--accent-cyan)", fontSize: 22 }}>
                            public
                        </span>
                    </div>
                    <div className="predictive-readiness-score-row">
                        <span className="predictive-readiness-score">{data.export_readiness_score}</span>
                        <span className="predictive-readiness-max">/ 100</span>
                    </div>
                    <div className="predictive-progress-track">
                        <div
                            className={`predictive-progress-fill ${data.export_readiness_score >= 75 ? "fill-green" : data.export_readiness_score >= 40 ? "fill-amber" : "fill-red"}`}
                            style={{ width: `${data.export_readiness_score}%` }}
                        />
                    </div>
                    <div className="predictive-trend-box">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--accent-cyan)" }}>
                            info
                        </span>
                        <span>{data.market_trend_analysis}</span>
                    </div>
                    {data.target_markets.length > 0 && (
                        <div className="predictive-markets-row">
                            {data.target_markets.map((m) => (
                                <span key={m} className="predictive-market-chip">{m}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card 3: AI Strategic Directives */}
                <div className="predictive-card predictive-strategy-card">
                    <div className="predictive-card-top-row">
                        <div className="predictive-card-label">
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--accent-amber)" }}>
                                lightbulb
                            </span>
                            AI Strategic Directives
                        </div>
                    </div>
                    <ul className="predictive-directive-list">
                        {data.strategic_advice.map((advice, index) => (
                            <li key={index} className="predictive-directive-item">
                                <span className="predictive-directive-number">{index + 1}</span>
                                <span className="predictive-directive-text">{advice}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
