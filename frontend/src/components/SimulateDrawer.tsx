"use client";

import { useState, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SimulateDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    // Current bank data for base values
    monthlyInflow: number;
    monthlyOutflow: number;
    adb: number;
    dsr: number;
    volatility: number;
    monthsAnalyzed: number;
    bounceCount: number;
    overdraftCount: number;
    monthlyBalances: number[];
    monthlyCredits: number[];
    projectedRevenue: number;
    totalAssets: number;
    yearsOperating: number;
}

interface SimResult {
    proxy_score: number;
    eligibility_index: number;
    net_cash_flow: number;
    dscr: number;
    expense_ratio: number;
    revenue_consistency: number;
    risk_classification: string;
    risk_color: string;
}

export default function SimulateDrawer({
    isOpen,
    onClose,
    monthlyInflow,
    monthlyOutflow,
    adb,
    dsr,
    volatility,
    monthsAnalyzed,
    bounceCount,
    overdraftCount,
    monthlyBalances,
    monthlyCredits,
    projectedRevenue,
    totalAssets,
    yearsOperating,
}: SimulateDrawerProps) {
    const [revenueAdj, setRevenueAdj] = useState(0);
    const [expenseAdj, setExpenseAdj] = useState(0);
    const [assetAdj, setAssetAdj] = useState(0);
    const [result, setResult] = useState<SimResult | null>(null);
    const [loading, setLoading] = useState(false);

    const runSimulation = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/bank/simulate`, {
                monthly_inflow: monthlyInflow,
                monthly_outflow: monthlyOutflow,
                adb,
                dsr,
                volatility,
                months_analyzed: monthsAnalyzed,
                bounce_count: bounceCount,
                overdraft_count: overdraftCount,
                monthly_balances: monthlyBalances,
                monthly_credits: monthlyCredits,
                revenue_adjustment: revenueAdj,
                expense_adjustment: expenseAdj,
                asset_adjustment: assetAdj,
                projected_revenue: projectedRevenue,
                total_assets: totalAssets,
                years_operating: yearsOperating,
            });
            setResult(res.data);
        } catch {
            console.error("Simulation failed");
        } finally {
            setLoading(false);
        }
    }, [
        monthlyInflow, monthlyOutflow, adb, dsr, volatility, monthsAnalyzed,
        bounceCount, overdraftCount, monthlyBalances, monthlyCredits,
        revenueAdj, expenseAdj, assetAdj,
        projectedRevenue, totalAssets, yearsOperating,
    ]);

    if (!isOpen) return null;

    return (
        <div className="sd-overlay" onClick={onClose}>
            <div className="sd-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="sd-header">
                    <h3 className="sd-title">🎯 What-If Simulator</h3>
                    <button className="sd-close" onClick={onClose}>✕</button>
                </div>

                <p className="sd-desc">
                    Adjust sliders to see how changes impact your eligibility score instantly.
                </p>

                {/* Revenue slider */}
                <div className="sd-slider-group">
                    <label className="sd-label">
                        Revenue Adjustment
                        <span className="sd-label-value" style={{ color: revenueAdj >= 0 ? "#34d399" : "#ef4444" }}>
                            {revenueAdj >= 0 ? "+" : ""}RM{revenueAdj.toLocaleString()}/mo
                        </span>
                    </label>
                    <input
                        type="range"
                        min="-5000"
                        max="10000"
                        step="500"
                        value={revenueAdj}
                        onChange={(e) => setRevenueAdj(Number(e.target.value))}
                        className="sd-slider"
                    />
                </div>

                {/* Expense slider */}
                <div className="sd-slider-group">
                    <label className="sd-label">
                        Expense Reduction
                        <span className="sd-label-value" style={{ color: expenseAdj <= 0 ? "#34d399" : "#ef4444" }}>
                            {expenseAdj <= 0 ? "" : "+"}RM{expenseAdj.toLocaleString()}/mo
                        </span>
                    </label>
                    <input
                        type="range"
                        min="-5000"
                        max="2000"
                        step="500"
                        value={expenseAdj}
                        onChange={(e) => setExpenseAdj(Number(e.target.value))}
                        className="sd-slider"
                    />
                </div>

                {/* Asset slider */}
                <div className="sd-slider-group">
                    <label className="sd-label">
                        Additional Assets
                        <span className="sd-label-value" style={{ color: "#34d399" }}>
                            +RM{assetAdj.toLocaleString()}
                        </span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100000"
                        step="5000"
                        value={assetAdj}
                        onChange={(e) => setAssetAdj(Number(e.target.value))}
                        className="sd-slider"
                    />
                </div>

                <button className="sd-run-btn" onClick={runSimulation} disabled={loading}>
                    {loading ? "Simulating..." : "▶ Run Simulation"}
                </button>

                {/* Results */}
                {result && (
                    <div className="sd-results">
                        <h4 className="sd-results-title">Simulated Results</h4>
                        <div className="sd-results-grid">
                            <div className="sd-result-item">
                                <span className="sd-result-label">Proxy Score</span>
                                <span className="sd-result-value">{result.proxy_score}</span>
                            </div>
                            <div className="sd-result-item">
                                <span className="sd-result-label">Eligibility</span>
                                <span className="sd-result-value">{result.eligibility_index}%</span>
                            </div>
                            <div className="sd-result-item">
                                <span className="sd-result-label">DSCR</span>
                                <span className="sd-result-value">{result.dscr}x</span>
                            </div>
                            <div className="sd-result-item">
                                <span className="sd-result-label">Net Cash Flow</span>
                                <span className="sd-result-value">RM{result.net_cash_flow.toLocaleString()}</span>
                            </div>
                            <div className="sd-result-item">
                                <span className="sd-result-label">Expense Ratio</span>
                                <span className="sd-result-value">{result.expense_ratio}%</span>
                            </div>
                            <div className="sd-result-item">
                                <span className="sd-result-label">Risk</span>
                                <span className="sd-result-value" style={{ color: result.risk_color === "green" ? "#34d399" : result.risk_color === "red" ? "#ef4444" : "#f59e0b" }}>
                                    {result.risk_classification}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
