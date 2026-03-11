"use client";

import { useMemo, useState } from "react";

// ─── Types ──────────────────────────────────────────────────
interface DayData {
    date: string;
    income: number;
}

interface HeatmapData {
    days: DayData[];
    maxIncome: number;
    totalRevenue: number;
    avgDaily: number;
    peakDay: { date: string; income: number };
    activeDays: number;
    availableYears: number[];
}

interface RevenueHeatmapProps {
    data: HeatmapData | null | undefined;
    year: number;
    onYearChange: (year: number) => void;
}

// ─── Constants ──────────────────────────────────────────────
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

// ─── Intensity ──────────────────────────────────────────────
function getLevel(income: number, max: number): number {
    if (income <= 0) return 0;
    const r = income / max;
    if (r < 0.15) return 1;
    if (r < 0.35) return 2;
    if (r < 0.60) return 3;
    return 4;
}

function formatRM(v: number): string {
    return `RM ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ──────────────────────────────────────────────
export default function RevenueHeatmap({ data, year, onYearChange }: RevenueHeatmapProps) {
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        date: string;
        income: number;
        delta: number;
    } | null>(null);

    // Build the annual grid: 53 columns (weeks) × 7 rows (weekdays)
    const { weeks, monthPositions } = useMemo(() => {
        if (!data?.days || data.days.length === 0) return { weeks: [], monthPositions: [] };

        const grid: (DayData & { prevIncome: number })[][] = [];
        let currentWeek: (DayData & { prevIncome: number })[] = [];

        // Pad the first week so Jan 1 lands on the correct weekday row
        const firstDate = new Date(data.days[0].date + "T00:00:00");
        const firstDow = (firstDate.getDay() + 6) % 7; // 0=Mon
        for (let i = 0; i < firstDow; i++) {
            currentWeek.push({ date: "", income: -1, prevIncome: 0 });
        }

        for (let i = 0; i < data.days.length; i++) {
            const d = data.days[i];
            const prev = i > 0 ? data.days[i - 1].income : 0;
            currentWeek.push({ ...d, prevIncome: prev });
            if (currentWeek.length === 7) {
                grid.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: "", income: -1, prevIncome: 0 });
            }
            grid.push(currentWeek);
        }

        // Compute month label positions (first week that contains a day in that month)
        const mPos: { label: string; col: number }[] = [];
        let lastMonth = -1;
        grid.forEach((week, colIdx) => {
            const validDay = week.find((d) => d.date);
            if (validDay && validDay.date) {
                const m = new Date(validDay.date + "T00:00:00").getMonth();
                if (m !== lastMonth) {
                    mPos.push({ label: MONTHS[m], col: colIdx });
                    lastMonth = m;
                }
            }
        });

        return { weeks: grid, monthPositions: mPos };
    }, [data?.days]);

    // Peak day formatted
    const peakDateStr = data?.peakDay?.date
        ? new Date(data.peakDay.date + "T00:00:00").toLocaleDateString("en-MY", {
            month: "short", day: "numeric",
        })
        : "—";

    // Empty state
    if (!data || !data.days || data.days.length === 0) {
        return (
            <div className="cmd-chart-empty">
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.2 }}>
                    calendar_month
                </span>
                <p>No transaction data for {year}.</p>
            </div>
        );
    }

    return (
        <div className="hm-annual">
            {/* Header: title + year selector */}
            <div className="hm-annual-header">
                <div>
                    <div className="hm-annual-title">Annual Performance Intensity</div>
                    <div className="hm-annual-sub">
                        Visualizing {data.days.length} days of revenue flow across MSME nodes&nbsp;
                        <span className="hm-legend-inline">
                            <span className="hm-legend-label-sm">LOW</span>
                            {[0, 1, 2, 3, 4].map((l) => (
                                <span key={l} className={`hm-cell-sm hm-level-${l}`} />
                            ))}
                            <span className="hm-legend-label-sm">PEAK</span>
                        </span>
                    </div>
                </div>
                <div className="hm-year-selector">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#06b6d4" }}>
                        calendar_today
                    </span>
                    <select
                        value={year}
                        onChange={(e) => onYearChange(parseInt(e.target.value))}
                        className="hm-year-select"
                    >
                        {(data.availableYears ?? [year]).map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="hm-annual-grid-area">
                {/* Month labels */}
                <div className="hm-month-row">
                    <div className="hm-weekday-spacer" />
                    {weeks.map((_, i) => {
                        const mEntry = monthPositions.find((m) => m.col === i);
                        return (
                            <div key={i} className="hm-month-cell">
                                {mEntry ? mEntry.label : ""}
                            </div>
                        );
                    })}
                </div>

                {/* Grid: weekday labels + cells */}
                <div className="hm-grid-wrap">
                    <div className="hm-weekday-col">
                        {WEEKDAYS.map((d, i) => (
                            <div key={i} className="hm-weekday-label">{d}</div>
                        ))}
                    </div>
                    <div className="hm-grid">
                        {weeks.map((week, colIdx) => (
                            <div key={colIdx} className="hm-col">
                                {week.map((day, rowIdx) => {
                                    const isEmpty = day.income < 0;
                                    const level = isEmpty ? 0 : getLevel(day.income, data.maxIncome);
                                    return (
                                        <div
                                            key={rowIdx}
                                            className={`hm-cell hm-level-${level}${isEmpty ? " hm-empty" : ""}`}
                                            onMouseEnter={(e) => {
                                                if (isEmpty) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setTooltip({
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top - 8,
                                                    date: day.date,
                                                    income: day.income,
                                                    delta: day.income - day.prevIncome,
                                                });
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Stat Cards */}
            <div className="hm-stats-row">
                <div className="hm-stat-card">
                    <div className="hm-stat-label">TOTAL ANNUAL REVENUE</div>
                    <div className="hm-stat-value">{formatRM(data.totalRevenue)}</div>
                    <div className="hm-stat-sub">
                        <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
                            <path d="M2 10 L5 6 L8 8 L12 3" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" />
                        </svg>
                        <span style={{ color: "#10b981" }}>{data.activeDays} active days</span>
                    </div>
                </div>
                <div className="hm-stat-card">
                    <div className="hm-stat-label">AVERAGE DAILY REVENUE</div>
                    <div className="hm-stat-value">{formatRM(data.avgDaily)}</div>
                    <div className="hm-stat-sub">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#06b6d4" }}>
                            show_chart
                        </span>
                        <span style={{ color: "#06b6d4" }}>Active day average</span>
                    </div>
                </div>
                <div className="hm-stat-card">
                    <div className="hm-stat-label">PEAK DAY PERFORMANCE</div>
                    <div className="hm-stat-value">{formatRM(data.peakDay.income)}</div>
                    <div className="hm-stat-sub">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#a855f7" }}>
                            star
                        </span>
                        <span style={{ color: "#a855f7" }}>{peakDateStr}</span>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="hm-tooltip"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    <div className="hm-tooltip-date">
                        {new Date(tooltip.date + "T00:00:00").toLocaleDateString("en-MY", {
                            weekday: "short", day: "numeric", month: "short", year: "numeric",
                        })}
                    </div>
                    <div className="hm-tooltip-amount">{formatRM(tooltip.income)}</div>
                    <div
                        className="hm-tooltip-delta"
                        style={{ color: tooltip.delta >= 0 ? "#10b981" : "#f43f5e" }}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginRight: 3 }}>
                            {tooltip.delta >= 0 ? (
                                <path d="M6 2 L10 8 L2 8 Z" fill="#10b981" />
                            ) : (
                                <path d="M6 10 L10 4 L2 4 Z" fill="#f43f5e" />
                            )}
                        </svg>
                        {tooltip.delta >= 0 ? "+" : ""}
                        {formatRM(Math.abs(tooltip.delta))}
                        <span className="hm-tooltip-pct"> vs. prev. day</span>
                    </div>
                </div>
            )}
        </div>
    );
}
