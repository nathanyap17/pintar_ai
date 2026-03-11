"use client";

import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────
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

interface IntelligenceDrawerProps {
    result: FusionResult | null;
    isOpen: boolean;
    destination: string;
    onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────
function frictionColor(level: string) {
    switch (level) {
        case "green": return "#10b981";
        case "yellow": return "#f59e0b";
        case "red": return "#ef4444";
        default: return "#64748b";
    }
}

function frictionGlow(level: string) {
    switch (level) {
        case "green": return "0 0 20px rgba(16, 185, 129, 0.5)";
        case "yellow": return "0 0 20px rgba(245, 158, 11, 0.5)";
        case "red": return "0 0 20px rgba(239, 68, 68, 0.5)";
        default: return "none";
    }
}

function trendIcon(trend: string) {
    switch (trend) {
        case "rising": return "trending_up";
        case "falling": return "trending_down";
        default: return "trending_flat";
    }
}

function trendColor(trend: string) {
    switch (trend) {
        case "rising": return "#ef4444";
        case "falling": return "#10b981";
        default: return "#64748b";
    }
}

function severityBadge(severity: string) {
    const colors: Record<string, string> = {
        low: "#10b981",
        medium: "#f59e0b",
        high: "#ef4444",
    };
    return colors[severity] || "#64748b";
}

// ─── Component ──────────────────────────────────────────────
export default function IntelligenceDrawer({
    result,
    isOpen,
    destination,
    onClose,
}: IntelligenceDrawerProps) {
    return (
        <AnimatePresence>
            {isOpen && result && (
                <motion.div
                    className="intel-drawer"
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                    {/* Header */}
                    <div className="intel-header">
                        <div>
                            <div className="intel-label">INTELLIGENCE BRIEF</div>
                            <h2 className="intel-dest">
                                Sarawak → {destination}
                            </h2>
                        </div>
                        <button onClick={onClose} className="intel-close">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Live Web-Grounded Badge */}
                    {result.web_grounded && (
                        <div className="intel-web-badge">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>language</span>
                            🌍 Live Web-Grounded Analysis
                        </div>
                    )}

                    {/* ─── Block 1: Friction Score ────────────── */}
                    <div className="intel-block">
                        <div className="intel-block-label">FRICTION SCORE</div>
                        <div className="intel-friction-row">
                            <div
                                className="intel-friction-gauge"
                                style={{
                                    color: frictionColor(result.friction_level),
                                    textShadow: frictionGlow(result.friction_level),
                                }}
                            >
                                {result.friction_score}
                            </div>
                            <div>
                                <div
                                    className="intel-friction-badge"
                                    style={{
                                        background: frictionColor(result.friction_level),
                                    }}
                                >
                                    {result.friction_level?.toUpperCase()}
                                </div>
                                <div className="intel-friction-range">
                                    0 ━━━━━ 30 ━━━━━ 60 ━━━━━ 100
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Block 2: Barrier Alerts ────────────── */}
                    <div className="intel-block">
                        <div className="intel-block-label">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                            {" "}LIVE BARRIER ALERTS
                        </div>
                        {result.barriers && result.barriers.length > 0 ? (
                            result.barriers.map((b, i) => (
                                <div key={i} className="intel-barrier-card">
                                    <div className="intel-barrier-top">
                                        <span
                                            className="intel-severity"
                                            style={{ background: severityBadge(b.severity) }}
                                        >
                                            {b.severity?.toUpperCase()}
                                        </span>
                                        <span className="intel-barrier-type">{b.type}</span>
                                    </div>
                                    <p className="intel-barrier-desc">{b.description}</p>
                                    {b.mitigation && (
                                        <p className="intel-barrier-fix">
                                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                                                lightbulb
                                            </span>{" "}
                                            {b.mitigation}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="intel-no-data">No active barriers detected</p>
                        )}
                    </div>

                    {/* ─── Block 3: Logistics Trends ──────────── */}
                    <div className="intel-block">
                        <div className="intel-block-label">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>local_shipping</span>
                            {" "}LOGISTICS TREND
                        </div>
                        <div className="intel-logistics-grid">
                            <div className="intel-stat">
                                <div className="intel-stat-value">{result.logistics.freight_index}</div>
                                <div className="intel-stat-label">Freight Index</div>
                            </div>
                            <div className="intel-stat">
                                <div className="intel-stat-value" style={{ color: trendColor(result.logistics.trend) }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                        {trendIcon(result.logistics.trend)}
                                    </span>
                                    {result.logistics.trend_pct > 0 ? "+" : ""}
                                    {result.logistics.trend_pct}%
                                </div>
                                <div className="intel-stat-label">Trend</div>
                            </div>
                            <div className="intel-stat">
                                <div className="intel-stat-value">{result.logistics.avg_days}d</div>
                                <div className="intel-stat-label">Transit</div>
                            </div>
                            <div className="intel-stat">
                                <div className="intel-stat-value">RM{result.logistics.cost_per_kg_myr}</div>
                                <div className="intel-stat-label">Per kg</div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Block 4: Financial Feasibility ─────── */}
                    {result.financial_feasibility && (
                        <div className="intel-block">
                            <div className="intel-block-label">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>account_balance</span>
                                {" "}FINANCIAL FEASIBILITY
                            </div>
                            <div className="intel-logistics-grid">
                                <div className="intel-stat">
                                    <div className="intel-stat-value">
                                        RM{result.financial_feasibility.cash_available_myr?.toLocaleString()}
                                    </div>
                                    <div className="intel-stat-label">Cash Available</div>
                                </div>
                                <div className="intel-stat">
                                    <div className="intel-stat-value">
                                        RM{result.financial_feasibility.estimated_export_cost_myr?.toLocaleString()}
                                    </div>
                                    <div className="intel-stat-label">Est. Cost</div>
                                </div>
                            </div>
                            <div
                                className="intel-feasibility-badge"
                                style={{
                                    background: result.financial_feasibility.can_absorb
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : "rgba(239, 68, 68, 0.15)",
                                    color: result.financial_feasibility.can_absorb
                                        ? "#10b981"
                                        : "#ef4444",
                                }}
                            >
                                {result.financial_feasibility.can_absorb
                                    ? "✅ Cash flow can absorb this export"
                                    : "⚠️ Insufficient cash flow — consider smaller shipment"}
                            </div>
                        </div>
                    )}

                    {/* ─── Block 5: Strategic Verdict ─────────── */}
                    <div className="intel-block intel-verdict-block">
                        <div className="intel-block-label">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>psychology</span>
                            {" "}AI STRATEGIC VERDICT
                        </div>
                        <p className="intel-verdict-text">
                            {result.strategic_verdict}
                        </p>
                    </div>

                    {/* Warnings */}
                    {result.warnings && result.warnings.length > 0 && (
                        <div className="intel-warnings">
                            {result.warnings.map((w, i) => (
                                <div key={i} className="intel-warning-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#f59e0b" }}>
                                        warning
                                    </span>
                                    {w}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Grounding Sources */}
                    {result.web_grounded && result.grounding_sources && result.grounding_sources.length > 0 && (
                        <div className="intel-block">
                            <div className="intel-block-label">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
                                {" "}WEB SOURCES
                            </div>
                            <div className="intel-grounding-chips">
                                {result.grounding_sources.map((src, i) => (
                                    <a
                                        key={i}
                                        href={src.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="intel-grounding-chip"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                                        {src.title || src.uri}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="intel-footer">
                        {result.sources_used} DEFA sources analyzed
                        {result.web_grounded ? " • Live Web-Grounded" : ""}
                        {" "}• Powered by Qwen 2.5 + Gemini
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
