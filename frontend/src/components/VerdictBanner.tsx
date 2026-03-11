"use client";

import { useState } from "react";

interface VerdictBannerProps {
    auditStatus: string;
    auditColor: string;
    auditDate: string;
    eligibilityIndex: number;
    strategicSummary: string;
    businessType?: string;
}

export default function VerdictBanner({
    auditStatus,
    auditColor,
    auditDate,
    eligibilityIndex,
    strategicSummary,
    businessType,
}: VerdictBannerProps) {
    const [showWhy, setShowWhy] = useState(false);

    const colorMap: Record<string, string> = {
        green: "#34d399",
        amber: "#f59e0b",
        red: "#ef4444",
    };

    const accentColor = colorMap[auditColor] || colorMap.amber;

    // Build a "Why?" explanation based on the audit status
    const whyText = auditColor === "red"
        ? `As a ${businessType || "business"}, your current financial metrics indicate weak Capacity (one of the 5 C's of Credit). Negative cash flow and high expense ratio signal that monthly outflows exceed inflows — banks see this as repayment risk. Focus on reducing non-essential expenses and increasing revenue consistency.`
        : auditColor === "green"
            ? `Strong financial profile across most metrics. As a ${businessType || "business"}, your DSCR, cash flow, and balance levels meet or exceed BNM benchmarks for your business size category — indicating solid repayment Capacity.`
            : `As a ${businessType || "business"}, some metrics meet BNM benchmarks while others need improvement. Your profile shows developing Capacity — maintain positive cash flow trends for 2+ months to strengthen your audit result.`;

    return (
        <div className="vb-container" style={{ borderColor: `${accentColor}33` }}>
            {/* Header row */}
            <div className="vb-header">
                <div className="vb-badge" style={{ background: accentColor }}>
                    AUDIT RESULT
                </div>
                <span className="vb-date">Run date: {auditDate}</span>
            </div>

            {/* Main content row */}
            <div className="vb-content">
                {/* Left: Status text */}
                <div className="vb-status-area">
                    <h2 className="vb-status-text" style={{ color: accentColor }}>
                        {auditStatus}
                        <button
                            className="vb-why-btn"
                            onClick={() => setShowWhy(!showWhy)}
                        >
                            {showWhy ? "✕ Close" : "? Why?"}
                        </button>
                    </h2>
                    <p className="vb-summary">&ldquo;{strategicSummary}&rdquo;</p>

                    {showWhy && (
                        <div className="vb-why-content">
                            {whyText}
                        </div>
                    )}
                </div>

                {/* Right: Eligibility index circle */}
                <div className="vb-index-circle">
                    <svg viewBox="0 0 120 120" className="vb-index-svg">
                        {/* Background ring */}
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                        {/* Progress ring */}
                        <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke={accentColor}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${eligibilityIndex * 3.14} ${(100 - eligibilityIndex) * 3.14}`}
                            strokeDashoffset="78.5"
                            className="vb-index-ring"
                        />
                    </svg>
                    <div className="vb-index-value">
                        <span className="vb-index-number" style={{ color: accentColor }}>
                            {eligibilityIndex}%
                        </span>
                        <span className="vb-index-label">ELIGIBILITY CHANCE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
