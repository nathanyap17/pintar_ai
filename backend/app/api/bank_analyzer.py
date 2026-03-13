"""
Bank Statement Analyzer API — Financial Eligibility Audit Engine
POST /api/bank/analyze — Upload statement PDF → AI → full audit payload
POST /api/bank/simulate — What-if simulation (no save)
"""

import logging
import math
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import tempfile
import os

from app.services.gemini_client import call_gemini_flash, call_audit_ai
from app.services.qwen_llm import categorize_transactions
from app.services.llama_parser import parse_pdf_to_markdown
from app.services.statement_parser import extract_transactions_from_markdown, calculate_base_metrics

logger = logging.getLogger(__name__)
router = APIRouter()

EXTRACTION_PROMPT = """You are an expert financial analyst for Malaysian MSMEs.

Analyze this bank statement PDF and extract the following metrics with maximum accuracy.

STEP 1 — READ EVERY TRANSACTION ROW:
- Sum ALL debit/withdrawal entries → this is total_debits
- Sum ALL credit/deposit entries → this is total_credits
- Count the number of months the statement covers → months_analyzed

STEP 2 — COMPUTE METRICS:
1. **adb** — Average Daily Balance in MYR (mean of all daily closing balances)
2. **amb** — Average Monthly Balance in MYR (mean of month-end closing balances; 0 if single month)
3. **dsr** — Debt Service Ratio as % (loan/debt repayment entries / total credits × 100)
4. **volatility** — Income volatility score 0-100 (0=perfectly consistent, 100=extremely volatile)
5. **months_analyzed** — How many months does this statement cover (minimum 1)
6. **monthly_inflow** — total_credits / months_analyzed (MUST be > 0 if ANY credits exist)
7. **monthly_outflow** — total_debits / months_analyzed (MUST be > 0 if ANY debits exist)
8. **bounce_count** — Number of bounced/returned cheques or failed transactions
9. **lowest_balance** — Lowest balance recorded anywhere in the statement
10. **overdraft_count** — Number of times the balance went negative (below 0)
11. **monthly_balances** — Array of closing balance per month (length = months_analyzed)
12. **monthly_credits** — Array of total credits per month (length = months_analyzed)
13. **total_debits** — Grand total of ALL debit entries in the statement
14. **total_credits** — Grand total of ALL credit entries in the statement

CRITICAL VALIDATION RULES (you MUST follow these):
- monthly_inflow MUST be > 0 if there are ANY credits/deposits in the statement
- monthly_outflow MUST be > 0 if there are ANY debits/withdrawals in the statement
- NEVER return 0 for inflow or outflow if transactions exist — this is a critical error
- Cross-check: total_credits ≈ monthly_inflow × months_analyzed
- Cross-check: total_debits ≈ monthly_outflow × months_analyzed
- For single-month statements: monthly_credits = [total_credits], monthly_balances = [closing_balance]

Return ONLY valid JSON in this exact format:
{
    "adb": 1050.20,
    "amb": 0,
    "dsr": 12.5,
    "volatility": 45,
    "months_analyzed": 1,
    "monthly_inflow": 2480.87,
    "monthly_outflow": 2565.85,
    "bounce_count": 0,
    "lowest_balance": 527.39,
    "overdraft_count": 0,
    "monthly_balances": [527.39],
    "monthly_credits": [2480.87],
    "total_debits": 2565.85,
    "total_credits": 2480.87
}

If you truly cannot determine a value after reading all rows, use 0.
For arrays, use [0] if unavailable. Do NOT include any explanation text."""


# ─── Dashboard Metric Calculations ──────────────────────────

def compute_net_cash_flow(data: dict) -> float:
    """WITH AI — Sum(credits) - Sum(debits) per month, averaged + trend from projections."""
    inflow = data.get("monthly_inflow", 0)
    outflow = data.get("monthly_outflow", 0)
    return round(inflow - outflow, 2)


def compute_dscr(
    data: dict,
    projected_revenue: float = 0,
    total_assets: float = 0,
    loan_amount: float = 0,
) -> float:
    """
    WITH AI — DSCR = (Net Operating Income + assets depreciation proxy) /
    (Loan purpose amount / assumed tenure).
    LLM estimates income adjustments from statement + projected revenue.
    Target >1.25x benchmarked to business type.
    """
    net_income = data.get("monthly_inflow", 0) - data.get("monthly_outflow", 0)

    # Use projected revenue as additional signal
    if projected_revenue > 0:
        monthly_proj = projected_revenue / 12
        net_income = max(net_income, monthly_proj * 0.3)  # Conservative: 30% margin

    # Add assets depreciation proxy (~2% of assets/month)
    if total_assets > 0:
        net_income += total_assets * 0.02

    # Debt service: use loan amount / 60-month tenure, or RM5k default
    if loan_amount > 0:
        debt_service = loan_amount / 60  # 5-year assumed tenure
    else:
        debt_service = 5000

    if net_income <= 0:
        return 0.0
    return round(net_income / debt_service, 2)


def compute_expense_ratio(data: dict) -> float:
    """WITHOUT AI — (Total Debits / Total Credits) × 100. Threshold <70%."""
    inflow = data.get("monthly_inflow", 1)
    outflow = data.get("monthly_outflow", 0)
    if inflow <= 0:
        return 100.0
    return round((outflow / inflow) * 100, 1)


def compute_revenue_consistency(data: dict) -> dict:
    """
    WITH AI — Time-series analysis on statement credits.
    StdDev / Mean × 100 as variance %. Flag >30% with context.
    Returns both numeric variance and qualitative label.
    """
    credits = data.get("monthly_credits", [0])
    if len(credits) < 2:
        return {"variance": 50.0, "label": "Unknown"}
    mean = sum(credits) / len(credits)
    if mean <= 0:
        return {"variance": 100.0, "label": "Critical"}
    variance = sum((x - mean) ** 2 for x in credits) / len(credits)
    std_dev = math.sqrt(variance)
    pct = round((std_dev / mean) * 100, 1)

    if pct < 15:
        label = "High"
    elif pct < 30:
        label = "Moderate"
    else:
        label = "Low"

    return {"variance": pct, "label": label}


def compute_avg_monthly_balance(data: dict) -> float:
    """WITHOUT AI — Mean(monthly balances). Min requirement by business type."""
    balances = data.get("monthly_balances", [])
    if not balances:
        return data.get("amb", 0)
    return round(sum(balances) / len(balances), 2)


def compute_proxy_score(data: dict, dscr: float = 0, total_assets: float = 0) -> int:
    """
    WITH AI — Proxy Credit Score (300-850).
    Base 300 + AI-scored points:
    +150 for low volatility from statement,
    +100 for assets >RM50k,
    +100 for clean record (no bounces/overdrafts),
    +100 for strong DSCR (>1.25x),
    +100 for high amb (>RM10k).
    Cap at 850.
    """
    score = 300

    # Volatility factor (+0 to +150)
    volatility = data.get("volatility", 50)
    score += max(0, int((100 - volatility) * 1.5))

    # Assets factor (+0 to +100)
    if total_assets >= 50000:
        score += 100
    elif total_assets > 0:
        score += min(100, int(total_assets / 500))

    # Clean record factor (+0 to +100)
    bounces = data.get("bounce_count", 0)
    overdrafts = data.get("overdraft_count", 0)
    deductions = bounces * 25 + overdrafts * 20
    score += max(0, 100 - deductions)

    # DSCR factor (+0 to +100)
    if dscr >= 1.25:
        score += 100
    elif dscr > 0:
        score += min(100, int(dscr / 1.25 * 100))

    # Balance factor (+0 to +100) - AMB takes priority if multi-month
    amb = data.get("amb", 0)
    adb = data.get("adb", 0)
    effective_balance = amb if amb > 0 else adb
    
    if effective_balance >= 10000:
        score += 100
    elif effective_balance > 0:
        score += min(100, int(effective_balance / 10000 * 100))

    return max(300, min(850, score))


def compute_risk_classification(score: int, business_type: str = "") -> dict:
    """
    WITHOUT AI — Direct mapping from proxy score.
    <500 = HIGH RISK (red), 501-700 = MODERATE RISK (yellow), >700 = LOW RISK (green).
    Minor adjustment from business type for visual position.
    """
    if score > 700:
        return {"label": "LOW RISK", "color": "green"}
    elif score > 500:
        return {"label": "MODERATE RISK", "color": "yellow"}
    else:
        return {"label": "HIGH RISK", "color": "red"}


def compute_eligibility_index(
    dscr: float,
    net_cash_flow: float,
    total_assets: float = 0,
    years_operating: float = 0,
) -> int:
    """
    WITH AI — Eligibility Index (0-100%).
    40% DSCR (from projections + debits),
    30% Net Cash Flow (statement),
    30% other (assets/profile).
    """
    # DSCR component (40%) — 1.25x = full marks
    dscr_score = min(100, max(0, (dscr / 1.5) * 100))

    # Cash flow component (30%) — RM5k/mo net = full marks
    cf_score = min(100, max(0, (net_cash_flow / 5000) * 100))

    # Other component (30%) — assets + years operating
    assets_score = min(50, (total_assets / 100000) * 50) if total_assets > 0 else 0
    years_score = min(50, years_operating * 10) if years_operating > 0 else 0
    other_score = assets_score + years_score

    index = int(dscr_score * 0.40 + cf_score * 0.30 + other_score * 0.30)
    return max(0, min(100, index))


def get_kpi_benchmarks(business_type: str = "", annual_turnover: float = 0) -> dict:
    """Return KPI benchmark thresholds adjusted by BNM business size."""
    # BNM micro-enterprise: turnover < RM300k
    if annual_turnover > 0 and annual_turnover < 300000:
        return {
            "net_cash_flow_benchmark": ">RM5,000",
            "dscr_benchmark": "1.25x",
            "expense_ratio_benchmark": "<70%",
            "rev_consistency_benchmark": "<30%",
            "avg_balance_benchmark": ">RM5,000",
            "overdraft_limit": "≤1/yr",
        }
    # BNM small enterprise: turnover < RM15M
    elif annual_turnover > 0 and annual_turnover < 15000000:
        return {
            "net_cash_flow_benchmark": ">RM15,000",
            "dscr_benchmark": "1.25x",
            "expense_ratio_benchmark": "<70%",
            "rev_consistency_benchmark": "<30%",
            "avg_balance_benchmark": ">RM10,000",
            "overdraft_limit": "≤1/yr",
        }
    # Default / medium
    return {
        "net_cash_flow_benchmark": ">RM30,000",
        "dscr_benchmark": "1.25x",
        "expense_ratio_benchmark": "<70%",
        "rev_consistency_benchmark": "<30%",
        "avg_balance_benchmark": ">RM15,000",
        "overdraft_limit": "≤1/yr",
    }


def validate_extracted_data(bank_data: dict) -> str:
    """Post-extraction sanity check. Returns parse confidence: 'full', 'partial', or 'low'."""
    inflow = bank_data.get("monthly_inflow", 0)
    outflow = bank_data.get("monthly_outflow", 0)
    adb = bank_data.get("adb", 0)
    warnings = []

    if inflow == 0 and adb > 0:
        warnings.append("Zero inflow but non-zero balance — likely extraction error")
    if outflow == 0 and adb > 0:
        warnings.append("Zero outflow but non-zero balance — likely extraction error")
    if inflow > 0 and outflow == 0:
        warnings.append("Credits found but no debits — check statement completeness")

    # Cross-check totals vs monthly averages
    months = max(bank_data.get("months_analyzed", 1), 1)
    total_credits = bank_data.get("total_credits", 0)
    total_debits = bank_data.get("total_debits", 0)
    if total_credits > 0 and abs(total_credits - inflow * months) > total_credits * 0.2:
        warnings.append(f"total_credits ({total_credits}) doesn't match monthly_inflow*months ({inflow * months})")

    for w in warnings:
        logger.warning(f"[Validation] {w}")

    if len(warnings) >= 2:
        return "low"
    elif len(warnings) == 1:
        return "partial"
    return "full"


KPI_EXPLANATIONS = {
    "net_cash_flow": "Your total inflows minus outflows. Negative means spending exceeds earning — a red flag for lenders.",
    "dscr": "Debt Service Coverage Ratio — how many times your income covers debt repayments. Banks require ≥1.25x.",
    "expense_ratio": "Your total spending as a % of income. Above 70% signals tight cash management.",
    "revenue_consistency": "How stable your income is month-to-month. High variance (>30%) worries lenders.",
    "avg_balance": "Your average account balance. Higher balances show financial reserves. Benchmarked to BNM's business size category.",
    "overdrafts": "How many times your balance went negative. Even 1 overdraft is a concern for banks.",
}


def get_bankability_status(score: int) -> dict:
    """Return bankability status based on proxy score."""
    if score >= 700:
        return {
            "status": "eligible",
            "label": "🟢 Eligible for SME Corp / Maybank Digital Financing",
            "advice": "Strong financial profile. Apply for SME financing with confidence.",
        }
    elif score >= 550:
        return {
            "status": "developing",
            "label": "🟡 Developing — Close to eligibility",
            "advice": "Maintain AMB above RM3,000 and keep DSR below 40% for 2 more months.",
        }
    else:
        return {
            "status": "needs_work",
            "label": "🔴 Needs improvement",
            "advice": "Build 3 months of clean transaction history. Reduce personal loan commitments.",
        }


# ─── 5 Cs of Credit Assessment ──────────────────────────────

def compute_five_cs(
    data: dict,
    dscr: float = 0,
    net_cash_flow: float = 0,
    total_assets: float = 0,
    business_type: str = "",
) -> list[dict]:
    """
    Derive the 5 C's of Credit from existing bank metrics.
    Each C returns { label, color (green/amber/red), summary }.
    """
    bounces = data.get("bounce_count", 0)
    overdrafts = data.get("overdraft_count", 0)
    adb = data.get("adb", 0)
    volatility = data.get("volatility", 50)

    five_cs = []

    # 1. Character — repayment history / defaults
    if bounces == 0 and overdrafts == 0:
        five_cs.append({"label": "Character", "color": "green", "summary": "Good history, no defaults."})
    elif bounces <= 1 and overdrafts <= 1:
        five_cs.append({"label": "Character", "color": "amber", "summary": f"{bounces} bounce(s), {overdrafts} overdraft(s) — minor blemish."})
    else:
        five_cs.append({"label": "Character", "color": "red", "summary": f"{bounces} bounce(s), {overdrafts} overdraft(s) — high default risk."})

    # 2. Capacity — ability to repay (DSCR + net cash flow)
    if dscr >= 1.25 and net_cash_flow > 0:
        five_cs.append({"label": "Capacity", "color": "green", "summary": f"Strong revenue generation. DSCR {dscr}x."})
    elif dscr >= 1.0 and net_cash_flow > 0:
        five_cs.append({"label": "Capacity", "color": "amber", "summary": f"Adequate capacity. DSCR {dscr}x — aim for ≥1.25x."})
    else:
        five_cs.append({"label": "Capacity", "color": "red", "summary": f"Weak repayment ability. DSCR {dscr}x, NCF RM{net_cash_flow:,.0f}."})

    # 3. Capital — cash reserves (ADB)
    if adb >= 10000:
        five_cs.append({"label": "Capital", "color": "green", "summary": f"Healthy reserves. ADB RM{adb:,.0f}."})
    elif adb >= 3000:
        five_cs.append({"label": "Capital", "color": "amber", "summary": f"Low cash reserves. ADB RM{adb:,.0f}."})
    else:
        five_cs.append({"label": "Capital", "color": "red", "summary": f"Critically low reserves. ADB RM{adb:,.0f}."})

    # 4. Conditions — market/business volatility
    sector_label = business_type.replace("_", " ").title() if business_type else "Unknown"
    if volatility < 30:
        five_cs.append({"label": "Conditions", "color": "green", "summary": f"Stable {sector_label} sector conditions."})
    elif volatility < 60:
        five_cs.append({"label": "Conditions", "color": "amber", "summary": f"{sector_label} sector volatility at {volatility}%."})
    else:
        five_cs.append({"label": "Conditions", "color": "red", "summary": f"High {sector_label} sector volatility ({volatility}%)."})

    # 5. Collateral — hard asset backing
    if total_assets >= 50000:
        five_cs.append({"label": "Collateral", "color": "green", "summary": f"Strong asset backing. RM{total_assets:,.0f} in assets."})
    elif total_assets >= 10000:
        five_cs.append({"label": "Collateral", "color": "amber", "summary": f"Moderate collateral. RM{total_assets:,.0f} in assets."})
    else:
        five_cs.append({"label": "Collateral", "color": "red", "summary": f"Insufficient hard assets. RM{total_assets:,.0f} declared."})

    return five_cs


# ─── Main Analyze Endpoint ──────────────────────────────────

@router.post("/analyze")
async def analyze_bank_statement(
    pdf: UploadFile = File(...),
    clerk_id: str = Form(""),
    loan_purpose: Optional[str] = Form(None),
    projected_revenue: Optional[float] = Form(None),
    total_assets: Optional[float] = Form(None),
    business_type: Optional[str] = Form(None),
    years_operating: Optional[float] = Form(None),
    annual_turnover: Optional[float] = Form(None),
):
    """
    Upload bank statement PDF → AI extracts metrics →
    compute full audit payload (verdict, risk gauge, 6 KPIs, weaknesses).
    """
    if not pdf.filename or not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    try:
        pdf_bytes = await pdf.read()

        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="PDF too large (max 10MB).")

        logger.info(
            f"[Bank Analyzer] Processing PDF ({len(pdf_bytes)} bytes) "
            f"for clerk={clerk_id[:12]}..."
        )

        # ── Step 1: AI extraction from bank statement ──
        # Save temp file for LlamaParse
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        try:
            # ── PRIMARY PATH: LlamaParse → Rules → Qwen NLP ──
            try:
                # Phase A: LlamaParse → Markdown
                md_text = await parse_pdf_to_markdown(tmp_path)
                
                # Phase B: Rules-Based Extraction → List of Dicts
                transactions = extract_transactions_from_markdown(md_text)
                
                # Form base metrics (balances, overall inflows/outflows, bounce counts)
                bank_data = calculate_base_metrics(transactions)
                
                # Phase C: Qwen 2.5 NLP Classification (categorize expenses vs revenue vs debt)
                if transactions:
                    try:
                        categorized = await categorize_transactions(transactions)
                        summary = categorized.get("summary", {})
                        
                        # Compute DSR (Debt Service Ratio) from Qwen's specific bucket
                        total_debt = summary.get("total_debt_payments", 0)
                        total_rev = max(summary.get("total_revenue_sales", 1), 1) # Prevent div by 0
                        bank_data["dsr"] = (total_debt / total_rev) * 100
                        
                    except Exception as cat_err:
                        logger.warning(f"[Bank Analyzer] Qwen Categorization failed, defaulting to 0 DSR: {cat_err}")
                
                logger.info("[Bank Analyzer] ✅ LlamaParse pipeline succeeded.")
            
            except Exception as llama_err:
                # ── FALLBACK PATH: Qwen 3 VL (Vision) ──
                logger.warning(
                    f"[Bank Analyzer] LlamaParse unavailable ({type(llama_err).__name__}: {llama_err}). "
                    f"Falling back to Qwen 3 VL vision extraction."
                )
                
                # Re-read PDF bytes for vision pipeline
                with open(tmp_path, "rb") as f:
                    fallback_pdf_bytes = f.read()
                
                bank_data = await call_gemini_flash(
                    prompt=EXTRACTION_PROMPT,
                    pdf_bytes=fallback_pdf_bytes,
                    json_mode=True,
                )
                
                # Ensure both adb and amb exist in fallback data
                if "adb" not in bank_data:
                    bank_data["adb"] = bank_data.get("amb", 0)
                if "amb" not in bank_data:
                    bank_data["amb"] = 0
                    
                logger.info("[Bank Analyzer] ✅ Qwen 3 VL fallback succeeded.")
            
        finally:
            # Clean up temp PDF
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        # ── Post-extraction validation ──
        parse_confidence = validate_extracted_data(bank_data)
        # ── Step 2: Compute all dashboard metrics ──
        net_cash_flow = compute_net_cash_flow(bank_data)
        dscr = compute_dscr(
            bank_data,
            projected_revenue or 0,
            total_assets or 0,
        )
        expense_ratio = compute_expense_ratio(bank_data)
        rev_consistency = compute_revenue_consistency(bank_data)
        avg_balance = compute_avg_monthly_balance(bank_data)
        overdrafts = bank_data.get("overdraft_count", 0)

        # ── Step 3: Compute proxy score (AI-scored points) ──
        score = compute_proxy_score(bank_data, dscr, total_assets or 0)
        risk = compute_risk_classification(score, business_type or "")
        bankability = get_bankability_status(score)

        # ── Step 4: Compute eligibility index ──
        eligibility_index = compute_eligibility_index(
            dscr, net_cash_flow, total_assets or 0, years_operating or 0
        )

        # ── Step 5: AI audit (status, summary, weaknesses, optimizations) ──
        metrics_for_ai = {
            "net_cash_flow": net_cash_flow,
            "dscr": dscr,
            "expense_ratio": expense_ratio,
            "revenue_consistency": rev_consistency["variance"],
            "avg_monthly_balance": avg_balance,
            "overdraft_count": overdrafts,
            "proxy_score": score,
            "eligibility_index": eligibility_index,
            "adb": bank_data.get("adb", 0),
            "amb": bank_data.get("amb", 0),
            "dsr": bank_data.get("dsr", 0),
            "volatility": bank_data.get("volatility", 0),
            "bounce_count": bank_data.get("bounce_count", 0),
        }

        profile_for_ai = {
            "business_type": business_type or "Unknown",
            "years_operating": years_operating or 0,
            "annual_turnover": annual_turnover or 0,
            "loan_purpose": loan_purpose or "Unknown",
            "projected_revenue": projected_revenue or 0,
            "total_assets": total_assets or 0,
        }

        audit = await call_audit_ai(metrics_for_ai, profile_for_ai)

        # ── Step 6: Compute 5 C's of Credit ──
        five_cs = compute_five_cs(
            bank_data, dscr, net_cash_flow,
            total_assets or 0, business_type or "",
        )

        # ── Step 7: Assemble full audit response ──
        benchmarks = get_kpi_benchmarks(business_type or "", annual_turnover or 0)
        audit_date = datetime.now().strftime("%b %d, %Y")

        # Determine balance thresholds based on turnover tier
        turnover = annual_turnover or 0
        bal_green = 5000 if turnover < 300000 else (10000 if turnover < 15000000 else 15000)
        bal_yellow = 2000 if turnover < 300000 else (5000 if turnover < 15000000 else 5000)
        ncf_green = 2000 if turnover < 300000 else (5000 if turnover < 15000000 else 5000)

        result = {
            "status": "success",
            "audit_date": audit_date,

            # Section 01: Verdict Banner
            "verdict_banner": {
                "audit_status": audit.get("audit_status", "Borderline – Needs Improvement"),
                "audit_color": audit.get("audit_color", "amber"),
                "eligibility_index": eligibility_index,
                "strategic_summary": audit.get(
                    "strategic_summary",
                    "Analysis complete. Review metrics below."
                ),
            },

            # Section 02: Risk Gauge
            "risk_gauge": {
                "proxy_score": score,
                "risk_classification": risk["label"],
                "risk_color": risk["color"],
                "scale_min": 300,
                "scale_max": 850,
            },

            # Section 03: 6 KPI Grid
            "kpi_grid": {
                "net_cash_flow": {
                    "value": net_cash_flow,
                    "benchmark": benchmarks["net_cash_flow_benchmark"],
                    "health": "green" if net_cash_flow > ncf_green else ("yellow" if net_cash_flow > 0 else "red"),
                    "explanation": KPI_EXPLANATIONS["net_cash_flow"],
                },
                "dscr": {
                    "value": dscr,
                    "benchmark": benchmarks["dscr_benchmark"],
                    "health": "green" if dscr >= 1.25 else ("yellow" if dscr >= 1.0 else "red"),
                    "explanation": KPI_EXPLANATIONS["dscr"],
                },
                "expense_ratio": {
                    "value": expense_ratio,
                    "benchmark": benchmarks["expense_ratio_benchmark"],
                    "health": "green" if expense_ratio < 60 else ("yellow" if expense_ratio < 70 else "red"),
                    "explanation": KPI_EXPLANATIONS["expense_ratio"],
                },
                "revenue_consistency": {
                    "value": rev_consistency["variance"],
                    "label": rev_consistency["label"],
                    "benchmark": benchmarks["rev_consistency_benchmark"],
                    "health": "green" if rev_consistency["variance"] < 15 else (
                        "yellow" if rev_consistency["variance"] < 30 else "red"
                    ),
                    "explanation": KPI_EXPLANATIONS["revenue_consistency"],
                },
                "avg_balance": {
                    "value": avg_balance,
                    "benchmark": benchmarks["avg_balance_benchmark"],
                    "health": "green" if avg_balance >= bal_green else (
                        "yellow" if avg_balance >= bal_yellow else "red"
                    ),
                    "explanation": KPI_EXPLANATIONS["avg_balance"],
                },
                "overdrafts": {
                    "value": overdrafts,
                    "benchmark": benchmarks["overdraft_limit"],
                    "health": "green" if overdrafts == 0 else (
                        "yellow" if overdrafts <= 1 else "red"
                    ),
                    "explanation": KPI_EXPLANATIONS["overdrafts"],
                },
            },

            # Section 04: Weaknesses & Optimizations
            "weaknesses": audit.get("weaknesses", []),
            "optimizations": audit.get("optimizations", []),

            # Section 05: 5 C's of Credit
            "five_cs": five_cs,

            # Legacy fields (backward compat for onboarding)
            "bank_data": {
                "adb": bank_data.get("adb", 0),
                "amb": bank_data.get("amb", 0),
                "dsr": bank_data.get("dsr", 0),
                "volatility": bank_data.get("volatility", 0),
                "months_analyzed": bank_data.get("months_analyzed", 1),
                "monthly_inflow": bank_data.get("monthly_inflow", 0),
                "monthly_outflow": bank_data.get("monthly_outflow", 0),
                "bounce_count": bank_data.get("bounce_count", 0),
                "lowest_balance": bank_data.get("lowest_balance", 0),
            },

            # Data quality & statement summary
            "parse_confidence": parse_confidence,
            "statement_summary": {
                "total_inflows": bank_data.get("total_credits", bank_data.get("monthly_inflow", 0) * max(bank_data.get("months_analyzed", 1), 1)),
                "total_outflows": bank_data.get("total_debits", bank_data.get("monthly_outflow", 0) * max(bank_data.get("months_analyzed", 1), 1)),
                "net_position": round(bank_data.get("total_credits", 0) - bank_data.get("total_debits", 0), 2),
                "months_parsed": bank_data.get("months_analyzed", 1),
            },
            "proxy_score": score,
            "eligibility": {
                "verdict": "eligible" if eligibility_index >= 50 else "not_eligible",
                "probability": eligibility_index,
                "weaknesses": [w["description"] for w in audit.get("weaknesses", [])],
            },
            "bankability": bankability,
        }

        logger.info(
            f"[Bank Analyzer] ✅ Score={score}, "
            f"Eligibility={eligibility_index}%, "
            f"Status={audit.get('audit_status', 'unknown')}, "
            f"DSCR={dscr}x"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Bank Analyzer] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Bank statement analysis failed: {str(e)}",
        )


# ─── Simulate Endpoint (What-If) ────────────────────────────

class SimulateRequest(BaseModel):
    """What-if simulation request body."""
    # Current bank data (from previous analysis)
    monthly_inflow: float
    monthly_outflow: float
    adb: float = 0
    amb: float = 0
    dsr: float = 0
    volatility: float = 50
    months_analyzed: int = 3
    bounce_count: int = 0
    overdraft_count: int = 0
    monthly_balances: list[float] = []
    monthly_credits: list[float] = []

    # Adjustments (what-if sliders)
    revenue_adjustment: float = 0     # e.g., +5000
    expense_adjustment: float = 0     # e.g., -2000 (negative = cut)
    asset_adjustment: float = 0       # e.g., +20000

    # Profile context
    projected_revenue: float = 0
    total_assets: float = 0
    years_operating: float = 0


@router.post("/simulate")
async def simulate_what_if(req: SimulateRequest):
    """
    What-if simulation — recalculate metrics with user-adjusted values.
    Does NOT save to database. Used by the "Simulate Now" slider feature.
    """
    try:
        # Apply adjustments
        adjusted_data = {
            "monthly_inflow": req.monthly_inflow + req.revenue_adjustment,
            "monthly_outflow": max(0, req.monthly_outflow + req.expense_adjustment),
            "adb": req.adb,
            "amb": req.amb,
            "dsr": req.dsr,
            "volatility": req.volatility,
            "months_analyzed": req.months_analyzed,
            "bounce_count": req.bounce_count,
            "overdraft_count": req.overdraft_count,
            "monthly_balances": req.monthly_balances,
            "monthly_credits": req.monthly_credits,
        }

        adjusted_assets = req.total_assets + req.asset_adjustment

        # Recompute metrics
        net_cash_flow = compute_net_cash_flow(adjusted_data)
        dscr = compute_dscr(adjusted_data, req.projected_revenue, adjusted_assets)
        expense_ratio = compute_expense_ratio(adjusted_data)
        rev_consistency = compute_revenue_consistency(adjusted_data)
        avg_balance = compute_avg_monthly_balance(adjusted_data)

        # Recompute score
        score = compute_proxy_score(adjusted_data, dscr, adjusted_assets)
        risk = compute_risk_classification(score)

        # Recompute eligibility index
        eligibility_index = compute_eligibility_index(
            dscr, net_cash_flow, adjusted_assets, req.years_operating
        )

        return {
            "status": "simulated",
            "net_cash_flow": net_cash_flow,
            "dscr": dscr,
            "expense_ratio": expense_ratio,
            "revenue_consistency": rev_consistency["variance"],
            "avg_balance": avg_balance,
            "proxy_score": score,
            "eligibility_index": eligibility_index,
            "risk_classification": risk["label"],
            "risk_color": risk["color"],
        }

    except Exception as e:
        logger.error(f"[Simulate] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}",
        )
