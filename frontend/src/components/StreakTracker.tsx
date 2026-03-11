"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface StreakTrackerProps {
    clerkId: string;
}

export default function StreakTracker({ clerkId }: StreakTrackerProps) {
    // Fetch last 30 days of ledger entries to identify active days
    const entries = useQuery(api.ledgers.getRecentEntries, clerkId ? { clerkId, days: 30 } : "skip");

    // Build a Set of active day strings (YYYY-MM-DD)
    const activeDays = new Set<string>();
    if (entries) {
        for (const entry of entries) {
            // Use transactionDate or createdAt
            const dateStr = entry.transactionDate
                ? entry.transactionDate.slice(0, 10)
                : new Date(entry.createdAt).toISOString().slice(0, 10);
            activeDays.add(dateStr);
        }
    }

    // Build 30-day grid (today going back 29 days)
    const today = new Date();
    const days: { date: string; label: string; isActive: boolean; isToday: boolean }[] = [];

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        days.push({
            date: dateStr,
            label: d.getDate().toString(),
            isActive: activeDays.has(dateStr),
            isToday: i === 0,
        });
    }

    // Compute current streak (consecutive active days ending today)
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].isActive) streak++;
        else break;
    }

    // Graduation percentage (target: 15 active days out of 30)
    const activeCount = activeDays.size;
    const graduation = Math.min(100, Math.round((activeCount / 15) * 100));

    return (
        <div className="st-container">
            <div className="st-header">
                <div className="st-header-left">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>
                        local_fire_department
                    </span>
                    <span className="st-header-text">30-DAY STREAK</span>
                </div>
                <div className="st-streak-badge">
                    <span className="st-streak-num">{streak}</span>
                    <span className="st-streak-label">day{streak !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* Grid */}
            <div className="st-grid">
                {days.map((day) => (
                    <div
                        key={day.date}
                        className={`st-cell ${day.isActive ? "st-cell-active" : ""} ${day.isToday ? "st-cell-today" : ""}`}
                        title={`${day.date}: ${day.isActive ? "✅ Active" : "—"}`}
                    >
                        <span className="st-cell-num">{day.label}</span>
                    </div>
                ))}
            </div>

            {/* Graduation bar */}
            <div className="st-grad">
                <div className="st-grad-label">
                    <span>Proxy Graduation</span>
                    <span className="st-grad-pct">{graduation}%</span>
                </div>
                <div className="st-grad-track">
                    <div
                        className="st-grad-fill"
                        style={{ width: `${graduation}%` }}
                    />
                </div>
                <p className="st-grad-hint">
                    {graduation >= 100
                        ? "🎉 Eligible for proxy credit scoring!"
                        : `${15 - activeCount > 0 ? 15 - activeCount : 0} more active days to unlock proxy score.`}
                </p>
            </div>
        </div>
    );
}
