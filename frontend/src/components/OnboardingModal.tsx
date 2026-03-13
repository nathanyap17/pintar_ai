"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// ─── Constants ──────────────────────────────────────────────
const BIZ_TYPES = [
    { value: "manufacturing", label: "Manufacturing", icon: "precision_manufacturing" },
    { value: "retail", label: "Retail / E-commerce", icon: "storefront" },
    { value: "services", label: "Services", icon: "support_agent" },
    { value: "agriculture", label: "Agriculture", icon: "agriculture" },
    { value: "f&b", label: "Food & Beverage", icon: "restaurant" },
    { value: "handicraft", label: "Handicraft / Artisan", icon: "palette" },
    { value: "other", label: "Other", icon: "category" },
] as const;

const LOAN_PURPOSES = [
    { value: "working_capital", label: "Working Capital" },
    { value: "expansion", label: "Business Expansion" },
    { value: "equipment", label: "Equipment Purchase" },
    { value: "inventory", label: "Inventory Stocking" },
    { value: "export", label: "Export Financing" },
    { value: "other", label: "Other" },
] as const;

const ASSET_TYPES = ["property", "vehicle", "inventory", "equipment", "other"] as const;

const REGIONS = ["Kuching", "Miri", "Sibu", "Bintulu", "Sarikei", "Kapit", "Sri Aman", "Limbang", "Other"] as const;

interface Asset {
    type: string;
    description: string;
    estimatedValue: number;
}

interface BankResult {
    status: string;
    bank_data: {
        adb: number; amb?: number; dsr: number; volatility: number;
        months_analyzed: number; monthsAnalyzed?: number;
        monthly_inflow: number; monthly_outflow: number;
        bounce_count?: number; lowest_balance?: number;
    };
    dashboard_metrics?: {
        net_cash_flow: number; dscr: number; expense_ratio: number;
        overdraft_count: number; revenue_consistency: number; avg_monthly_balance: number;
    };
    proxy_score: number;
    eligibility?: { verdict: string; probability: number; weaknesses: string[] };
    bankability: { status: string; label: string; advice: string };
    // Audit fields (State B dashboard)
    audit_date?: string;
    verdict_banner?: {
        audit_status: string; audit_color: string;
        eligibility_index: number; strategic_summary: string;
    };
    risk_gauge?: {
        proxy_score: number; risk_classification: string; risk_color: string;
    };
    weaknesses?: { title: string; description: string; drag_pct: number }[];
    optimizations?: { title: string; steps: string[]; target_weakness: string }[];
    five_cs?: { label: string; color: string; summary: string }[];
    parse_confidence?: string;
    statement_summary?: {
        total_inflows: number; total_outflows: number;
        net_position: number; months_parsed: number;
    };
}

// ─── Auto-categorize business size per BNM ─────────────────
function categorizeBnm(turnover: number): string {
    if (turnover < 300000) return "micro";
    if (turnover < 15000000) return "small";
    return "medium";
}

// ─── Component ──────────────────────────────────────────────
export default function OnboardingModal({ isOpen = false, onClose }: { isOpen?: boolean, onClose?: () => void }) {
    const { user } = useUser();
    const clerkId = user?.id ?? "";
    const profile = useQuery(api.profiles.getByClerkId, clerkId ? { clerkId } : "skip");
    const upsertProfile = useMutation(api.profiles.upsert);
    const completeOnboarding = useMutation(api.profiles.completeOnboarding);
    const updateBankData = useMutation(api.dashboard.upsertBankData);

    // Wizard state
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");

    // Step 1: Business Profile
    const [biz, setBiz] = useState("");
    const [ssmNumber, setSsmNumber] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [region, setRegion] = useState("");
    const [yearsOperating, setYearsOperating] = useState(2);
    const [annualTurnover, setAnnualTurnover] = useState(0);

    // Step 2: Loan & Projection
    const [loanPurpose, setLoanPurpose] = useState("");
    const [projectedRevenue, setProjectedRevenue] = useState(0);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [newAssetType, setNewAssetType] = useState("equipment");
    const [newAssetDesc, setNewAssetDesc] = useState("");
    const [newAssetValue, setNewAssetValue] = useState(0);

    // Step 3: Financial Upload
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [creditConsent, setCreditConsent] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bankResult, setBankResult] = useState<BankResult | null>(null);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // ─── Upload handler (must be before early returns) ──────
    const handleUpload = useCallback(async () => {
        if (!pdfFile) return;
        setUploading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("pdf", pdfFile);
            formData.append("clerk_id", clerkId);
            // Pass loan context for DSCR calculation
            if (loanPurpose) formData.append("loan_purpose", loanPurpose);
            if (projectedRevenue > 0) formData.append("projected_revenue", String(projectedRevenue));
            const totalAssets = assets.reduce((s, a) => s + a.estimatedValue, 0);
            if (totalAssets > 0) formData.append("total_assets", String(totalAssets));
            // Pass business context for audit AI
            if (businessType) formData.append("business_type", businessType);
            if (yearsOperating > 0) formData.append("years_operating", String(yearsOperating));
            if (annualTurnover > 0) formData.append("annual_turnover", String(annualTurnover));

            const res = await fetch(`${API}/api/bank/analyze`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Upload failed" }));
                throw new Error(err.detail || "Analysis failed");
            }

            const data: BankResult = await res.json();
            setBankResult(data);

            const months = (data.bank_data as Record<string, number>).months_analyzed ?? data.bank_data.monthsAnalyzed ?? 1;
            const dm = data.dashboard_metrics;

            // Save extended bank data to Convex
            await updateBankData({
                clerkId,
                bankData: {
                    adb: data.bank_data.adb,
                    amb: data.bank_data.amb,
                    dsr: data.bank_data.dsr,
                    volatility: data.bank_data.volatility,
                    monthsAnalyzed: months,
                    extractedAt: Date.now(),
                    monthlyInflow: data.bank_data.monthly_inflow ?? dm?.net_cash_flow,
                    monthlyOutflow: data.bank_data.monthly_outflow,
                    bounceCount: data.bank_data.bounce_count,
                    lowestBalance: data.bank_data.lowest_balance,
                    netCashFlow: dm?.net_cash_flow,
                    dscr: dm?.dscr,
                    expenseRatio: dm?.expense_ratio,
                    overdraftCount: dm?.overdraft_count,
                    revenueConsistency: dm?.revenue_consistency,
                    avgMonthlyBalance: dm?.avg_monthly_balance,
                },
                proxyScore: data.proxy_score,
                eligibilityVerdict: data.eligibility?.verdict,
                eligibilityProbability: data.eligibility?.probability,
                eligibilityWeaknesses: data.eligibility?.weaknesses,
                // Audit fields (State B dashboard)
                auditStatus: data.verdict_banner?.audit_status,
                auditColor: data.verdict_banner?.audit_color,
                auditDate: data.audit_date,
                strategicSummary: data.verdict_banner?.strategic_summary,
                eligibilityIndex: data.verdict_banner?.eligibility_index,
                riskClassification: data.risk_gauge?.risk_classification,
                auditWeaknesses: data.weaknesses?.map(w => ({
                    title: w.title,
                    description: w.description,
                    dragPct: w.drag_pct,
                })),
                auditOptimizations: data.optimizations?.map(o => ({
                    title: o.title,
                    steps: o.steps,
                    targetWeakness: o.target_weakness,
                })),
                parseConfidence: data.parse_confidence,
                fiveCsAnalysis: data.five_cs,
            });

            await completeOnboarding({ clerkId, tier: "formalized" });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }, [pdfFile, clerkId, API, loanPurpose, projectedRevenue, assets, updateBankData, completeOnboarding]);

    // ─── Early returns (after all hooks) ────────────────────
    if (!clerkId || profile === undefined) return null;
    if (!isOpen) return null;

    // ─── Step handlers ──────────────────────────────────────
    const handleStep1 = async () => {
        if (!biz.trim()) { setError("Business name is required."); return; }
        if (!businessType) { setError("Please select a business type."); return; }
        if (yearsOperating < 1) {
            setError("⚠️ Businesses under 1 year may not qualify — complete onboarding to see options.");
        }
        setError("");
        const size = annualTurnover > 0 ? categorizeBnm(annualTurnover) : undefined;
        await upsertProfile({
            clerkId,
            businessName: biz.trim(),
            ssmNumber: ssmNumber.trim() || undefined,
            businessType,
            region: region || undefined,
            yearsOperating,
            annualTurnover: annualTurnover || undefined,
            businessSize: size,
        });
        setStep(2);
    };

    const handleStep2 = async () => {
        // Validate: AI warns about missing collateral
        const warnings: string[] = [];
        if (!loanPurpose) warnings.push("No loan purpose selected — this weakens your application context.");
        if (assets.length === 0) warnings.push("Missing assets? This weakens Collateral — add items for a better verdict.");
        if (projectedRevenue <= 0) warnings.push("No revenue projection — AI can auto-fill from statements if uploaded.");
        setValidationWarnings(warnings);

        await upsertProfile({
            clerkId,
            loanPurpose: loanPurpose || undefined,
            projectedRevenue12m: projectedRevenue || undefined,
            assetList: assets.length > 0 ? assets : undefined,
        });
        setStep(3);
    };

    const addAsset = () => {
        if (!newAssetDesc.trim() || newAssetValue <= 0) return;
        setAssets([...assets, { type: newAssetType, description: newAssetDesc.trim(), estimatedValue: newAssetValue }]);
        setNewAssetDesc("");
        setNewAssetValue(0);
    };

    const removeAsset = (i: number) => setAssets(assets.filter((_, idx) => idx !== i));

    const handleSkip = async () => {
        await completeOnboarding({ clerkId, tier: "incubator" });
    };

    // ─── Render ─────────────────────────────────────────────
    return (
        <div className="ob-overlay">
            <div className="ob-modal">
                {onClose && (
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 16, right: 16, 
                            background: 'transparent', border: 'none', 
                            color: 'var(--primary)', cursor: 'pointer', 
                            fontSize: 24, zIndex: 50
                        }}
                    >
                        ✕
                    </button>
                )}
                {/* Progress bar */}
                <div className="ob-progress">
                    <div className="ob-progress-bar">
                        <div className="ob-progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                    </div>
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`ob-progress-dot ${step >= s ? "ob-progress-active" : ""}`}>
                            {step > s ? "✓" : s}
                        </div>
                    ))}
                </div>

                {/* ═══ STEP 1: Business Profile Basics ═══ */}
                {step === 1 && (
                    <div className="ob-step">
                        <div className="ob-step-icon">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <h2 className="ob-title">Business Profile</h2>
                        <p className="ob-sub">Core details to check your eligibility and tailor your experience.</p>

                        <div className="ob-field">
                            <label className="ob-label">Business Name *</label>
                            <input className="ob-input" placeholder="e.g., Mak Cik Sambal Enterprise" value={biz} onChange={(e) => setBiz(e.target.value)} />
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">SSM Registration Number</label>
                            <input className="ob-input" placeholder="e.g., 202301012345 (optional)" value={ssmNumber} onChange={(e) => setSsmNumber(e.target.value)} />
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Business Type *</label>
                            <div className="ob-chip-row">
                                {BIZ_TYPES.map((t) => (
                                    <button key={t.value} className={`ob-chip ${businessType === t.value ? "ob-chip-active" : ""}`} onClick={() => setBusinessType(t.value)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Region (Sarawak)</label>
                            <select className="ob-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                                <option value="">Select region...</option>
                                {REGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                            </select>
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Years Operating: <strong>{yearsOperating === 10 ? "10+" : yearsOperating}</strong></label>
                            <input type="range" className="ob-slider" min={0} max={10} step={1} value={yearsOperating} onChange={(e) => setYearsOperating(Number(e.target.value))} />
                            {yearsOperating < 1 && (
                                <p className="ob-warning">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                                    Less than 1 year — most financing requires ≥1 year operating history.
                                </p>
                            )}
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Annual Turnover Estimate (RM)</label>
                            <input type="number" className="ob-input" placeholder="e.g., 120000" value={annualTurnover || ""} onChange={(e) => setAnnualTurnover(Number(e.target.value))} />
                            {annualTurnover > 0 && (
                                <p className="ob-hint">
                                    Auto-classified: <strong>{categorizeBnm(annualTurnover).toUpperCase()}</strong> enterprise (BNM)
                                </p>
                            )}
                        </div>

                        {error && <p className="ob-error">{error}</p>}

                        <button className="ob-btn ob-btn-primary" onClick={handleStep1}>
                            Continue
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                    </div>
                )}

                {/* ═══ STEP 2: Loan & Projection Details ═══ */}
                {step === 2 && (
                    <div className="ob-step">
                        <div className="ob-step-icon">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <h2 className="ob-title">Loan & Projection Details</h2>
                        <p className="ob-sub">Help us simulate your financing eligibility accurately.</p>

                        <div className="ob-field">
                            <label className="ob-label">Loan Purpose</label>
                            <select className="ob-select" value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)}>
                                <option value="">Select purpose...</option>
                                {LOAN_PURPOSES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
                            </select>
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Projected Revenue — Next 12 Months (RM)</label>
                            <input type="number" className="ob-input" placeholder="e.g., 180000" value={projectedRevenue || ""} onChange={(e) => setProjectedRevenue(Number(e.target.value))} />
                            <p className="ob-hint">AI will auto-fill from your bank statements if left blank.</p>
                        </div>

                        <div className="ob-field">
                            <label className="ob-label">Assets (for Collateral simulation)</label>
                            <div className="ob-asset-list">
                                {assets.map((a, i) => (
                                    <div key={i} className="ob-asset-item">
                                        <span className="ob-asset-type">{a.type}</span>
                                        <span className="ob-asset-desc">{a.description}</span>
                                        <span className="ob-asset-val">RM {a.estimatedValue.toLocaleString()}</span>
                                        <button className="ob-asset-remove" onClick={() => removeAsset(i)}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div className="ob-asset-add">
                                <select className="ob-select ob-select-sm" value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)}>
                                    {ASSET_TYPES.map((t) => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
                                </select>
                                <input className="ob-input ob-input-sm" placeholder="Description" value={newAssetDesc} onChange={(e) => setNewAssetDesc(e.target.value)} />
                                <input type="number" className="ob-input ob-input-sm" placeholder="RM value" value={newAssetValue || ""} onChange={(e) => setNewAssetValue(Number(e.target.value))} />
                                <button className="ob-btn ob-btn-sm" onClick={addAsset}>+ Add</button>
                            </div>
                        </div>

                        {validationWarnings.length > 0 && (
                            <div className="ob-warnings">
                                {validationWarnings.map((w, i) => (
                                    <p key={i} className="ob-warning">
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                                        {w}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="ob-btn-row">
                            <button className="ob-btn ob-btn-ghost" onClick={() => setStep(1)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                                Back
                            </button>
                            <button className="ob-btn ob-btn-primary" onClick={handleStep2}>
                                Continue
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP 3: Financial Uploads ═══ */}
                {step === 3 && !bankResult && (
                    <div className="ob-step">
                        <div className="ob-step-icon">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <h2 className="ob-title">Upload Bank Statements</h2>
                        <p className="ob-sub">
                            Upload 3–12 months of bank statements (PDF). Our AI extracts financial metrics
                            and simulates your bankability in seconds.
                        </p>

                        <div
                            className="ob-dropzone"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") setPdfFile(f); }}
                        >
                            {pdfFile ? (
                                <div className="ob-file-info">
                                    <span className="material-symbols-outlined" style={{ color: "#06b6d4" }}>picture_as_pdf</span>
                                    <span>{pdfFile.name}</span>
                                    <button className="ob-file-remove" onClick={() => setPdfFile(null)}>✕</button>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined ob-drop-icon">cloud_upload</span>
                                    <p>Drag & drop your bank statement PDF</p>
                                    <p className="ob-drop-hint">or click to browse · 3–12 months recommended</p>
                                    <input
                                        type="file" accept=".pdf" className="ob-file-input"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Credit report consent */}
                        <div className="ob-toggle-row" style={{ marginTop: 16 }}>
                            <div className="ob-toggle-info">
                                <span className="ob-toggle-label">Authorize CCRIS/CTOS Proxy Simulation</span>
                                <span className="ob-toggle-hint">AI simulates credit check from your statements</span>
                            </div>
                            <button className={`ob-toggle ${creditConsent ? "ob-toggle-on" : ""}`} onClick={() => setCreditConsent(!creditConsent)}>
                                <div className="ob-toggle-thumb" />
                            </button>
                        </div>

                        {error && <p className="ob-error">{error}</p>}

                        <div className="ob-btn-row">
                            <button className="ob-btn ob-btn-ghost" onClick={() => setStep(2)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                                Back
                            </button>
                            {pdfFile ? (
                                <button className="ob-btn ob-btn-primary" onClick={handleUpload} disabled={uploading}>
                                    {uploading ? (
                                        <><span className="material-symbols-outlined ob-spin">progress_activity</span> Analyzing...</>
                                    ) : (
                                        <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span> Analyze with AI</>
                                    )}
                                </button>
                            ) : (
                                <button className="ob-btn ob-btn-skip" onClick={handleSkip}>
                                    Skip — Start with WhatsApp
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                                </button>
                            )}
                        </div>

                        <p className="ob-privacy">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                            Your data stays private — processed by AI, never stored externally.
                        </p>
                    </div>
                )}

                {/* ═══ STEP 3 — Success ═══ */}
                {step === 3 && bankResult && (
                    <div className="ob-step">
                        <div className="ob-step-icon ob-step-success">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <h2 className="ob-title">Analysis Complete!</h2>

                        {/* Verdict banner */}
                        {bankResult.eligibility && (
                            <div className={`ob-verdict ${bankResult.eligibility.verdict === "eligible" ? "ob-verdict-green" : "ob-verdict-red"}`}>
                                <div className="ob-verdict-label">
                                    {bankResult.eligibility.verdict === "eligible" ? "✅ Eligible" : "⚠️ Not Yet Eligible"}
                                </div>
                                <div className="ob-verdict-bar">
                                    <div className="ob-verdict-fill" style={{ width: `${bankResult.eligibility.probability}%` }} />
                                </div>
                                <div className="ob-verdict-pct">{bankResult.eligibility.probability}% approval chance</div>
                            </div>
                        )}

                        <div className="ob-result-grid">
                            <div className="ob-result-card">
                                <span className="ob-result-label">PINTAR Score</span>
                                <span className="ob-result-value ob-glow-cyan">{bankResult.proxy_score}</span>
                            </div>
                            <div className="ob-result-card">
                                <span className="ob-result-label">ADB</span>
                                <span className="ob-result-value">RM {bankResult.bank_data.adb.toLocaleString()}</span>
                            </div>
                            <div className="ob-result-card">
                                <span className="ob-result-label">DSR</span>
                                <span className="ob-result-value">{bankResult.bank_data.dsr}%</span>
                            </div>
                        </div>

                        {/* Weaknesses */}
                        {bankResult.eligibility?.weaknesses && bankResult.eligibility.weaknesses.length > 0 && (
                            <div className="ob-weaknesses">
                                <p className="ob-weak-title">Prioritized Actions:</p>
                                {bankResult.eligibility.weaknesses.map((w, i) => (
                                    <p key={i} className="ob-weak-item">
                                        <span className="ob-weak-num">{i + 1}</span>
                                        {w}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className={`ob-bankability ob-bank-${bankResult.bankability.status}`}>
                            <span>{bankResult.bankability.label}</span>
                            <p>{bankResult.bankability.advice}</p>
                        </div>

                        <button className="ob-btn ob-btn-primary" onClick={() => window.location.reload()}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
