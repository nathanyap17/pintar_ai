"use client";

import { memo, useState } from "react";

interface ScoreFactor {
    label: string;
    points: string;
}

interface RiskGaugeProps {
    score: number;
    classification: string;
    color: string;
    scoreBreakdown?: ScoreFactor[];
}

function RiskGaugeInner({ score, classification, color, scoreBreakdown }: RiskGaugeProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Gauge arc parameters — 240° arc (from 150° to 390°)
    const radius = 120;
    const cx = 150;
    const cy = 160;
    const startAngle = 150;
    const endAngle = 390;
    const totalArc = endAngle - startAngle;

    // Normalize score (300-850) to (0-1)
    const normalized = Math.max(0, Math.min(1, (score - 300) / 550));
    const needleAngle = startAngle + normalized * totalArc;

    // Convert angle to coordinates
    const toCoord = (angle: number, r: number) => ({
        x: cx + r * Math.cos((angle * Math.PI) / 180),
        y: cy + r * Math.sin((angle * Math.PI) / 180),
    });

    // Arc path helper
    const arcPath = (r: number, start: number, end: number) => {
        const s = toCoord(start, r);
        const e = toCoord(end, r);
        const largeArc = end - start > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
    };

    // Color zones (red <500, yellow 500-700, green >700)
    const redEnd = startAngle + ((500 - 300) / 550) * totalArc;
    const yellowEnd = startAngle + ((700 - 300) / 550) * totalArc;

    // Needle endpoint
    const needle = toCoord(needleAngle, radius - 15);

    const colorMap: Record<string, string> = {
        green: "#34d399",
        yellow: "#f59e0b",
        red: "#ef4444",
    };

    return (
        <div className="rg-container">
            <h3 className="rg-title">
                OVERALL RISK GAUGE
                <span className="rg-info" title="AI proxy credit score simulating CTOS">ℹ</span>
            </h3>
            <svg viewBox="0 0 300 220" className="rg-svg">
                {/* Background arc segments */}
                <path d={arcPath(radius, startAngle, redEnd)} fill="none" stroke="#ef4444" strokeWidth="18" strokeLinecap="round" opacity="0.3" />
                <path d={arcPath(radius, redEnd, yellowEnd)} fill="none" stroke="#f59e0b" strokeWidth="18" strokeLinecap="round" opacity="0.3" />
                <path d={arcPath(radius, yellowEnd, endAngle)} fill="none" stroke="#34d399" strokeWidth="18" strokeLinecap="round" opacity="0.3" />

                {/* Active arc (up to current score) */}
                <path
                    d={arcPath(radius, startAngle, needleAngle)}
                    fill="none"
                    stroke={`url(#rg-gradient-${color})`}
                    strokeWidth="18"
                    strokeLinecap="round"
                    className="rg-arc-active"
                />

                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="rg-gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="rg-gradient-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="rg-gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="40%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <filter id="rg-glow">
                        <feGaussianBlur stdDeviation="4" result="blurred" />
                        <feMerge>
                            <feMergeNode in="blurred" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Needle dot */}
                <circle cx={needle.x} cy={needle.y} r="8" fill={colorMap[color] || "#f59e0b"} filter="url(#rg-glow)" className="rg-needle" />

                {/* Score number */}
                <text x={cx} y={cy - 10} textAnchor="middle" className="rg-score-text" fill="white" fontSize="52" fontFamily="'Orbitron', monospace" fontWeight="700">
                    {score}
                </text>

                {/* Classification */}
                <text x={cx} y={cy + 20} textAnchor="middle" className="rg-class-text" fill={colorMap[color] || "#f59e0b"} fontSize="14" fontWeight="700" letterSpacing="2">
                    {classification}
                </text>

                {/* Scale label */}
                <text x={cx} y={cy + 45} textAnchor="middle" fill="var(--text-muted)" fontSize="11" opacity="0.6">
                    Scale: 300–850
                </text>
            </svg>

            {/* Details button */}
            <button
                className="rg-details-btn"
                onClick={() => setShowDetails(!showDetails)}
            >
                {showDetails ? "▴ Hide Details" : "▾ Score Breakdown"}
            </button>

            {showDetails && scoreBreakdown && scoreBreakdown.length > 0 && (
                <div className="rg-breakdown">
                    {scoreBreakdown.map((f, i) => (
                        <div key={i} className="rg-factor">
                            <span className="rg-factor-label">{f.label}</span>
                            <span className="rg-factor-value">{f.points}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const RiskGauge = memo(RiskGaugeInner);
export default RiskGauge;
