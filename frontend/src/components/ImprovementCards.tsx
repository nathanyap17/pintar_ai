"use client";

import { useState } from "react";

interface Weakness {
    title: string;
    description: string;
    dragPct: number;
}

interface Optimization {
    title: string;
    steps: string[];
    targetWeakness: string;
}

interface ImprovementCardsProps {
    weaknesses: Weakness[];
    optimizations: Optimization[];
    onSimulate?: () => void;
}

// Map weakness categories to icons
function getWeaknessIcon(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("cash") || t.includes("flow")) return "💰";
    if (t.includes("expense") || t.includes("ratio")) return "📊";
    if (t.includes("balance")) return "🏦";
    if (t.includes("dscr") || t.includes("debt")) return "⚖️";
    if (t.includes("revenue") || t.includes("consistency")) return "📈";
    if (t.includes("overdraft") || t.includes("bounce")) return "🔒";
    return "⚠";
}

export default function ImprovementCards({
    weaknesses,
    optimizations,
    onSimulate,
}: ImprovementCardsProps) {
    const [expandedOpt, setExpandedOpt] = useState<number | null>(null);

    return (
        <div className="ic-container">
            {/* Left: Prioritized Weaknesses */}
            <div className="ic-panel">
                <h3 className="ic-panel-title">PRIORITIZED WEAKNESSES</h3>
                <div className="ic-weakness-list">
                    {weaknesses.map((w, i) => (
                        <div key={i} className="ic-weakness-card">
                            <div className="ic-weakness-icon">
                                <span className="ic-cat-icon">{getWeaknessIcon(w.title)}</span>
                            </div>
                            <div className="ic-weakness-content">
                                <div className="ic-weakness-title">{w.title}</div>
                                <div className="ic-weakness-desc">{w.description}</div>
                            </div>
                            {w.dragPct > 0 && (
                                <div className="ic-weakness-drag">
                                    <span className="ic-drag-value">-{w.dragPct}%</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {weaknesses.length === 0 && (
                        <div className="ic-empty">No significant weaknesses detected.</div>
                    )}
                </div>
            </div>

            {/* Right: How to Improve */}
            <div className="ic-panel">
                <h3 className="ic-panel-title">HOW TO IMPROVE</h3>
                <div className="ic-optimize-list">
                    {optimizations.map((opt, i) => (
                        <div
                            key={i}
                            className={`ic-optimize-card ${expandedOpt === i ? "ic-optimize-card--expanded" : ""}`}
                            onClick={() => setExpandedOpt(expandedOpt === i ? null : i)}
                        >
                            <div className="ic-optimize-header">
                                <span className="ic-optimize-icon">⚡</span>
                                <span className="ic-optimize-title">{opt.title}</span>
                                <span className="ic-optimize-chevron">{expandedOpt === i ? "▴" : "▾"}</span>
                            </div>
                            {expandedOpt === i && (
                                <>
                                    <ul className="ic-optimize-steps">
                                        {opt.steps.map((step, j) => (
                                            <li key={j}>• {step}</li>
                                        ))}
                                    </ul>
                                    <a
                                        className="ic-learn-link"
                                        href="https://www.bnm.gov.my/sme-financing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        📚 Learn More — BNM SME Portal →
                                    </a>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Simulate Now button */}
                {onSimulate && (
                    <button className="ic-simulate-btn" onClick={onSimulate}>
                        🎯 Simulate Now
                    </button>
                )}
            </div>
        </div>
    );
}
