"use client";

import { useEffect, useRef, useState } from "react";

interface ProxyScoreGaugeProps {
    score: number; // 300-850
    label?: string;
    advice?: string;
}

export default function ProxyScoreGauge({ score, label, advice }: ProxyScoreGaugeProps) {
    const [animatedScore, setAnimatedScore] = useState(300);
    const animRef = useRef<number | null>(null);

    // Animate score on mount / change
    useEffect(() => {
        const start = animatedScore;
        const end = Math.max(300, Math.min(850, score));
        const duration = 1200;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedScore(Math.round(start + (end - start) * eased));
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [score]);

    // Gauge geometry
    const cx = 140, cy = 130, r = 100;
    const startAngle = 135; // degrees from 12 o'clock
    const endAngle = 405;   // 270-degree arc
    const totalArc = endAngle - startAngle;

    // Score → angle
    const normalizedScore = (animatedScore - 300) / 550;
    const needleAngle = startAngle + normalizedScore * totalArc;

    // Arc path helper
    const polarToCart = (angle: number, radius: number) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
    };

    // Background arc path
    const arcPath = (from: number, to: number, radius: number) => {
        const s = polarToCart(from, radius);
        const e = polarToCart(to, radius);
        const largeArc = to - from > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
    };

    // Color zones (3 segments for R/Y/G)
    const zones = [
        { from: startAngle, to: startAngle + totalArc * 0.364, color: "#ef4444" },  // 300-500 Red
        { from: startAngle + totalArc * 0.364, to: startAngle + totalArc * 0.636, color: "#f59e0b" }, // 500-650 Yellow
        { from: startAngle + totalArc * 0.636, to: endAngle, color: "#10b981" },    // 650-850 Green
    ];

    // Needle end point
    const needleEnd = polarToCart(needleAngle, r - 12);
    const needleBase1 = polarToCart(needleAngle + 90, 4);
    const needleBase2 = polarToCart(needleAngle - 90, 4);

    // Score color
    const scoreColor = animatedScore >= 650 ? "#10b981" : animatedScore >= 500 ? "#f59e0b" : "#ef4444";

    return (
        <div className="psg-container">
            <div className="psg-header">
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>speed</span>
                <span className="psg-header-text">PINTAR PROXY SCORE</span>
            </div>

            <svg viewBox="0 0 280 180" className="psg-svg">
                <defs>
                    <filter id="psg-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background track */}
                <path
                    d={arcPath(startAngle, endAngle, r)}
                    fill="none"
                    stroke="rgba(71, 85, 105, 0.15)"
                    strokeWidth="14"
                    strokeLinecap="round"
                />

                {/* Color zones */}
                {zones.map((zone, i) => (
                    <path
                        key={i}
                        d={arcPath(zone.from, zone.to, r)}
                        fill="none"
                        stroke={zone.color}
                        strokeWidth="14"
                        strokeLinecap="round"
                        opacity={0.25}
                    />
                ))}

                {/* Active arc (filled to current score) */}
                {normalizedScore > 0 && (
                    <path
                        d={arcPath(startAngle, needleAngle, r)}
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="14"
                        strokeLinecap="round"
                        filter="url(#psg-glow)"
                        opacity={0.8}
                    />
                )}

                {/* Needle */}
                <polygon
                    points={`${needleEnd.x},${needleEnd.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
                    fill={scoreColor}
                    filter="url(#psg-glow)"
                />
                <circle cx={cx} cy={cy} r="6" fill={scoreColor} opacity="0.6" />
                <circle cx={cx} cy={cy} r="3" fill="#0f172a" />

                {/* Score text */}
                <text
                    x={cx}
                    y={cy + 35}
                    textAnchor="middle"
                    fill={scoreColor}
                    fontFamily="'Orbitron', monospace"
                    fontSize="28"
                    fontWeight="bold"
                >
                    {animatedScore}
                </text>

                {/* Range labels */}
                <text x="32" y="168" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="'Orbitron', sans-serif">300</text>
                <text x="248" y="168" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="'Orbitron', sans-serif">850</text>
            </svg>

            {/* Bankability label */}
            {label && <div className="psg-label">{label}</div>}
            {advice && <p className="psg-advice">{advice}</p>}
        </div>
    );
}
