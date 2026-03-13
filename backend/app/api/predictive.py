"""
Neuro-Symbolic Predictive Analytics API — Advancement 2
POST /api/predictive/insights

Fuses micro-data (user's Convex ledger history) with macro-data
(ASEAN economic context) through a neuro-symbolic pipeline:
- Python calculates exact financial projections (deterministic math)
- Qwen 2.5-72B generates strategic narrative (symbolic reasoning)
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.qwen_llm import call_qwen

logger = logging.getLogger(__name__)
router = APIRouter()

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")

# Load macro-data from static JSON (robust path resolution)
_MACRO_DATA_PATH = Path(__file__).parent.parent / "data" / "asean_macro_context.json"
try:
    MACRO_CONTEXT = json.loads(_MACRO_DATA_PATH.read_text(encoding="utf-8"))
    logger.info(f"Loaded ASEAN macro context: {list(MACRO_CONTEXT.keys())}")
except Exception as e:
    logger.warning(f"Could not load macro context: {e}")
    MACRO_CONTEXT = {}


def _get_convex_client():
    """Lazy Convex client."""
    if not CONVEX_URL:
        return None
    from convex import ConvexClient
    return ConvexClient(CONVEX_URL)


class PredictiveRequest(BaseModel):
    clerk_id: str


@router.post("/insights")
async def get_predictive_insights(req: PredictiveRequest):
    """
    Neuro-symbolic predictive analytics.
    Pipeline:
    1. Micro-data extraction (Convex)
    2. Deterministic math engine
    3. Macro-data fusion
    4. LLM strategy generation (Qwen 2.5)
    """
    try:
        # ─── 1. MICRO-DATA EXTRACTION ───────────────────────────────
        convex = _get_convex_client()

        # Default values (used if Convex unavailable or no data)
        total_inflow = 0
        total_outflow = 0
        net_income = 0
        total_entries = 0
        avg_sentiment = 5.0
        reliability_score = 0
        recent_destinations = []
        current_month_income = 0
        current_month_expense = 0
        last_month_income = 0
        last_month_expense = 0
        top_items = []
        income_7d = 0
        expense_7d = 0

        if convex:
            try:
                # Get financial summary
                summary = convex.query(
                    "ledgers:getSummary",
                    {"clerkId": req.clerk_id},
                )
                if summary:
                    total_inflow = summary.get("totalInflow", 0)
                    total_outflow = summary.get("totalOutflow", 0)
                    net_income = summary.get("netIncome", 0)
                    total_entries = summary.get("totalEntries", 0)
                    avg_sentiment = summary.get("avgSentiment", 5.0)
                    reliability_score = summary.get("reliabilityScore", 0)

                # Get individual entries for MoM + top items calculation
                entries = convex.query(
                    "ledgers:getByUser",
                    {"clerkId": req.clerk_id, "limit": 200},
                )
                if entries:
                    now = datetime.now()
                    current_month_start = now.replace(day=1)
                    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
                    seven_days_ago = now - timedelta(days=7)

                    item_counter: Counter = Counter()
                    item_revenue: dict = {}

                    for entry in entries:
                        try:
                            entry_date = datetime.fromisoformat(
                                entry.get("transactionDate", "")
                            )
                        except (ValueError, TypeError):
                            continue

                        amount = entry.get("amountMyr", 0)
                        classification = entry.get("classification", "")
                        item_desc = entry.get("itemDescription", "Unknown")

                        # Top items tracking (only based on inflows usually)
                        if classification == "PAYMENT_IN":
                            item_counter[item_desc] += 1
                            item_revenue[item_desc] = item_revenue.get(item_desc, 0) + amount

                        # MoM income/expense
                        if classification == "PAYMENT_IN":
                            if entry_date >= current_month_start:
                                current_month_income += amount
                            elif entry_date >= last_month_start:
                                last_month_income += amount
                        elif classification == "CAPITAL_OUT":
                            if entry_date >= current_month_start:
                                current_month_expense += amount
                            elif entry_date >= last_month_start:
                                last_month_expense += amount

                        # 7-day cash flow
                        if entry_date >= seven_days_ago:
                            if classification == "PAYMENT_IN":
                                income_7d += amount
                            elif classification == "CAPITAL_OUT":
                                expense_7d += amount

                    # Build top items list
                    top_items = [
                        {
                            "item": item,
                            "count": count,
                            "total_myr": round(item_revenue.get(item, 0), 2),
                        }
                        for item, count in item_counter.most_common(5)
                    ]

                # Get recent export interests
                try:
                    export_logs = convex.query(
                        "export_queries:getByUser",
                        {"clerkId": req.clerk_id, "limit": 10},
                    )
                    if export_logs:
                        seen = set()
                        for log in export_logs:
                            dest = log.get("destination")
                            if dest and dest not in seen:
                                recent_destinations.append(dest)
                                seen.add(dest)
                except Exception as e:
                    logger.warning(f"Export query lookup failed: {e}")

            except Exception as e:
                logger.warning(f"Convex data extraction failed: {e}")

        # ─── 2. DETERMINISTIC MATH ENGINE (Neuro) ───────────────────

        current_month_net = current_month_income - current_month_expense
        last_month_net = last_month_income - last_month_expense

        # MoM growth based on net income
        import math
        if last_month_net != 0:
            mom_growth_pct = round(
                ((current_month_net - last_month_net) / abs(last_month_net)) * 100, 1
            )
        elif current_month_net > 0:
            mom_growth_pct = 100.0  # First month with positive net income
        else:
            mom_growth_pct = 0.0

        # Baseline 30-day projection (linear extrapolation based on net income)
        days_in_month = 30
        current_day = datetime.now().day
        
        if current_day > 0 and current_day <= days_in_month:
            # Pro-rate current month net income to 30 days
            projected_current_month = (current_month_net / current_day) * days_in_month
            # Average with historical growth trend
            baseline_predicted = round(
                projected_current_month * (1 + (min(mom_growth_pct, 50) / 100)), 2
            )
        elif net_income > 0:
            baseline_predicted = round(net_income * 1.05, 2)  # 5% growth assumption
        else:
            baseline_predicted = 0.0

        # Export readiness score (deterministic composite)
        export_readiness = min(100, max(0, int(
            (reliability_score * 0.4) +
            (min(avg_sentiment, 10) * 3) +
            (min(total_entries, 50) * 0.4) +
            (len(recent_destinations) * 5)
        )))

        # 7-day income-to-expense ratio
        if expense_7d > 0:
            income_expense_ratio = round(income_7d / expense_7d, 2)
        elif income_7d > 0:
            income_expense_ratio = 99.0  # All income, no expense
        else:
            income_expense_ratio = 0.0

        # ─── 3. MACRO-DATA FUSION ──────────────────────────────────

        if not recent_destinations:
            recent_destinations = ["Singapore", "Brunei"]

        relevant_macro = {
            country: MACRO_CONTEXT.get(country)
            for country in recent_destinations
            if country in MACRO_CONTEXT
        }

        # Identify top product for export compass
        top_product = top_items[0]["item"] if top_items else "general goods"

        # ─── 4. LLM STRATEGY ENGINE (Symbolic) ─────────────────────

        system_prompt = (
            "You are PINTAR.ai, an elite Business Strategist for ASEAN MSMEs "
            "based in Sarawak, Borneo. You provide hyper-localized, actionable "
            "trade advice. Accept all financial data as absolute truth — do NOT "
            "recalculate any numbers."
        )

        user_prompt = f"""
[HARD FINANCIAL DATA — DO NOT RECALCULATE]
- Current 30-Day Net Income: RM {current_month_net} (Income: RM {current_month_income}, Expense: RM {current_month_expense})
- Last 30-Day Net Income: RM {last_month_net}
- Month-over-Month Net Income Growth: {mom_growth_pct}%
- Predicted Net Income (Next 30 Days): RM {baseline_predicted}
- Total Lifetime Inflow: RM {total_inflow}
- Total Lifetime Outflow: RM {total_outflow}
- Total Lifetime Net Income: RM {net_income}
- Total Transactions: {total_entries}
- Buyer Trust/Sentiment Score: {avg_sentiment}/10
- Export Readiness Score: {export_readiness}/100
- 7-Day Income: RM {income_7d}
- 7-Day Expense: RM {expense_7d}
- Income-to-Expense Ratio (7d): {income_expense_ratio}
- Top Product: {top_product}
- Target Markets: {recent_destinations}

[MACRO ECONOMIC CONTEXT]
{json.dumps(relevant_macro, indent=2)}

Task: Generate a comprehensive business intelligence report for this Sarawak MSME.

Output STRICTLY as JSON:
{{
    "market_trend_analysis": "<1-2 sentences: how macro data impacts this specific MSME>",
    "liquidity_warning": {{
        "severity": "green|yellow|red",
        "message": "<1-2 sentences: cash flow health assessment based on 7-day income-to-expense ratio>"
    }},
    "strategic_advice": [
        "<Actionable directive 1: specific to their financial position>",
        "<Actionable directive 2: compliance, pricing, or inventory action>",
        "<Actionable directive 3: growth or risk mitigation step>"
    ],
    "export_compass": [
        {{
            "market": "<Country name>",
            "rank": 1,
            "reason": "<Why this market is ideal for their top product>",
            "friction": "<Brief compliance friction summary>"
        }},
        {{
            "market": "<Country name>",
            "rank": 2,
            "reason": "<Secondary market rationale>",
            "friction": "<Brief compliance friction>"
        }}
    ]
}}
"""

        try:
            llm_result = await call_qwen(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.4,
                max_tokens=1500,
                json_mode=True,
            )
        except Exception as e:
            logger.error(f"LLM strategy generation failed: {e}")
            llm_result = {
                "market_trend_analysis": "AI strategy engine temporarily unavailable.",
                "liquidity_warning": {
                    "severity": "yellow",
                    "message": "Unable to assess cash flow right now. Check back shortly.",
                },
                "strategic_advice": [
                    "Continue building your Shadow Ledger history for improved predictions.",
                    "Run a Customs Navigator check for your target markets.",
                ],
                "export_compass": [],
            }

        # Ensure llm_result is a dict
        if isinstance(llm_result, str):
            try:
                llm_result = json.loads(llm_result)
            except json.JSONDecodeError:
                llm_result = {
                    "market_trend_analysis": llm_result[:200],
                    "liquidity_warning": {"severity": "yellow", "message": "Parsing error."},
                    "strategic_advice": ["Continue building transaction history."],
                    "export_compass": [],
                }

        # ─── RESPONSE ──────────────────────────────────────────────

        return {
            # Deterministic values (Math engine output)
            "predicted_30d_revenue_myr": baseline_predicted,
            "current_month_revenue_myr": current_month_net, # For backward compat or UI
            "growth_indicator": f"{mom_growth_pct}%",
            "mom_growth_pct": mom_growth_pct,
            "export_readiness_score": export_readiness,
            "total_revenue_myr": total_inflow, # backward compat
            "total_inflow": total_inflow,
            "total_outflow": total_outflow,
            "net_income": net_income,
            "total_entries": total_entries,
            "avg_sentiment": avg_sentiment,
            "target_markets": recent_destinations,
            "top_items": top_items,
            "income_7d": income_7d,
            "expense_7d": expense_7d,
            "income_expense_ratio": income_expense_ratio,

            # LLM-generated values (Strategy engine output)
            "market_trend_analysis": llm_result.get(
                "market_trend_analysis",
                "No analysis available yet.",
            ),
            "liquidity_warning": llm_result.get(
                "liquidity_warning",
                {"severity": "yellow", "message": "Insufficient data for assessment."},
            ),
            "strategic_advice": llm_result.get(
                "strategic_advice",
                ["Build more transaction history for better predictions."],
            ),
            "export_compass": llm_result.get(
                "export_compass",
                [],
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predictive insights failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Prediction engine error: {str(e)}",
        )
