"use client";

import { useState } from "react";

interface KpiMetric {
    label: string;
    value: string | number;
    benchmark: string;
    health: string; // "green" | "yellow" | "red"
    icon: string;
    sublabel?: string;
    explanation?: string;
}

interface MetricGridProps {
    metrics: KpiMetric[];
}

function MiniBarIndicator({ health }: { health: string }) {
    const colorMap: Record<string, string> = {
        green: "#34d399",
        yellow: "#f59e0b",
        red: "#ef4444",
    };
    const color = colorMap[health] || colorMap.yellow;

    // 4 bars with varying heights based on health
    const heights = health === "green"
        ? [60, 80, 100, 90]
        : health === "yellow"
            ? [50, 70, 60, 80]
            : [40, 30, 50, 35];

    return (
        <div className="mc-minibar">
            {heights.map((h, i) => (
                <div
                    key={i}
                    className="mc-minibar-bar"
                    style={{
                        height: `${h}%`,
                        background: color,
                        opacity: 0.6 + i * 0.1,
                    }}
                />
            ))}
        </div>
    );
}

function MetricTooltip({ text, health }: { text: string; health: string }) {
    const tipColor = health === "red"
        ? "rgba(239, 68, 68, 0.12)"
        : health === "yellow"
            ? "rgba(245, 158, 11, 0.12)"
            : "rgba(52, 211, 153, 0.12)";

    return (
        <div className="mc-tooltip" style={{ background: tipColor }}>
            <span className="mc-tooltip-text">{text}</span>
            {health === "red" && (
                <span className="mc-tooltip-tip">
                    💡 For Sarawak businesses: Contact SDEC for free advisory on improving this metric.
                </span>
            )}
        </div>
    );
}

export default function MetricGrid({ metrics }: MetricGridProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <div className="mc-grid">
            {metrics.map((m, i) => (
                <div
                    key={i}
                    className={`mc-card mc-card--${m.health}`}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                >
                    <div className="mc-card-header">
                        <span className="mc-card-label">{m.label}</span>
                        <span className="mc-card-icon">{m.icon}</span>
                    </div>
                    <div className="mc-card-value">{m.value}</div>
                    {m.sublabel && <div className="mc-card-sublabel">{m.sublabel}</div>}
                    <div className="mc-card-benchmark">Benchmark: {m.benchmark}</div>
                    <MiniBarIndicator health={m.health} />

                    {/* Hover explanation tooltip */}
                    {hoveredIdx === i && m.explanation && (
                        <MetricTooltip text={m.explanation} health={m.health} />
                    )}
                </div>
            ))}
        </div>
    );
}
