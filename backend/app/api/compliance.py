"""
Cross-Border Compliance Sentinel API — Solution 3 (Enhanced)
POST /api/compliance/query    — Original RAG-based compliance check
POST /api/compliance/analyze  — Data fusion: Shadow Ledger + DEFA + WTO + FRED
"""

import os
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.rag_engine import search_similar_documents, format_context
from app.services.qwen_llm import assess_compliance, assess_compliance_fused
from app.services.cached_fetch import cached_fetch

logger = logging.getLogger(__name__)
router = APIRouter()

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")
DATA_DIR = Path(__file__).parent.parent / "data"


def _get_convex_client():
    if not CONVEX_URL:
        return None
    from convex import ConvexClient
    return ConvexClient(CONVEX_URL)


# ─── Load mock data files ────────────────────────────────────
def _load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load {filename}: {e}")
        return {}


WTO_DATA = _load_json("wto_barriers.json")
FRED_DATA = _load_json("fred_logistics.json")


# ═══════════════════════════════════════════════════════════════
#  ENDPOINT 1: Original RAG-based compliance query (preserved)
# ═══════════════════════════════════════════════════════════════

class ComplianceQuery(BaseModel):
    product: str = Field(..., description="Product description")
    origin: str = Field(default="Sarawak", description="Origin region")
    destination: str = Field(..., description="Destination country")
    clerk_id: str = Field(default="", description="Clerk user ID for logging")


@router.post("/query")
async def query_compliance(query: ComplianceQuery):
    """
    RAG-powered compliance assessment.
    Pipeline: Embed query → Convex vector search → Qwen reasoning → traffic-light
    """
    try:
        search_query = f"{query.product} export from {query.origin} to {query.destination}"
        documents = await search_similar_documents(search_query, limit=5)
        context = format_context(documents)

        result = await assess_compliance(
            product=query.product,
            origin=query.origin,
            destination=query.destination,
            context_docs=context,
        )

        result["sources_used"] = len(documents)

        if query.clerk_id:
            convex = _get_convex_client()
            if convex:
                try:
                    convex.mutation(
                        "export_queries:insert",
                        {
                            "clerkId": query.clerk_id,
                            "product": query.product,
                            "destination": query.destination,
                            "status": result.get("status", "unknown"),
                        },
                    )
                except Exception as e:
                    logger.warning(f"Export query log failed (non-blocking): {e}")

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Compliance query failed: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════
#  ENDPOINT 2: Data Fusion — Compliance Analyze (new)
# ═══════════════════════════════════════════════════════════════

class ComplianceAnalyzeRequest(BaseModel):
    product: str = Field(..., description="Product to export")
    origin: str = Field(default="Sarawak", description="Origin region")
    destination: str = Field(..., description="Destination country")
    clerk_id: str = Field(default="", description="Clerk user ID for financial data")


@router.post("/analyze")
async def analyze_compliance(req: ComplianceAnalyzeRequest):
    """
    Data Fusion compliance analysis — the 'Holy Trinity':
    1. Micro-data: MSME financial reality from Shadow Ledger (Convex)
    2. Regulatory: DEFA docs via RAG
    3. External: WTO barriers + FRED logistics (cached/mocked)
    """
    try:
        logger.info(
            f"[Compliance Fusion] {req.product} → {req.destination} "
            f"(clerk={req.clerk_id[:12]}...)"
        )

        # ─── Stream 1: Micro-Data (MSME Shadow Ledger) ────────
        financial = {"revenue_30d": 0, "total_revenue": 0, "liquidity_status": "unknown"}
        if req.clerk_id:
            convex = _get_convex_client()
            if convex:
                try:
                    ledger_entries = convex.query(
                        "ledgers:getByUser",
                        {"clerkId": req.clerk_id, "limit": 100},
                    )
                    if ledger_entries:
                        total = sum(e.get("amountMyr", 0) for e in ledger_entries)
                        financial["total_revenue"] = total
                        financial["revenue_30d"] = total  # simplified for demo
                        financial["liquidity_status"] = (
                            "healthy" if total > 1000 else
                            "moderate" if total > 200 else
                            "tight"
                        )
                except Exception as e:
                    logger.warning(f"[Compliance Fusion] Convex micro-data error: {e}")

        # ─── Stream 2: WTO Barriers (cached mock) ─────────────
        async def fetch_wto():
            return WTO_DATA.get(req.destination, {
                "friction_base": 50,
                "sps_alerts": [],
                "tbt_barriers": [],
                "de_minimis_usd": 200,
                "avg_clearance_days": 5,
            })

        wto_barriers = await cached_fetch(
            f"wto_{req.destination}", fetch_wto, ttl=600
        )

        # ─── Stream 3: FRED Logistics (cached mock) ───────────
        async def fetch_fred():
            return FRED_DATA.get(req.destination, {
                "freight_index": 100,
                "freight_trend": "stable",
                "freight_trend_pct": 0,
                "avg_transit_days": 5,
                "shipping_cost_per_kg_myr": 4.0,
                "port": "Unknown",
            })

        logistics = await cached_fetch(
            f"fred_{req.destination}", fetch_fred, ttl=600
        )

        # ─── Stream 4: DEFA Regulatory (RAG) ──────────────────
        search_query = f"{req.product} export from {req.origin} to {req.destination}"
        documents = await search_similar_documents(search_query, limit=5)
        context = format_context(documents)

        # ─── Stream 5: Live Web Grounding (Gemini + Google Search) ──
        web_grounded = False
        grounding_sources = []
        web_context = ""
        try:
            from app.services.gemini_client import call_gemini_with_search
            web_query = (
                f"Current export requirements and regulations for {req.product} "
                f"from {req.origin} to {req.destination}. "
                f"Include halal certification, SPS requirements, customs duties, "
                f"and any state-specific regulations."
            )
            web_result = await call_gemini_with_search(web_query)
            web_context = web_result.get("text", "")
            web_grounded = web_result.get("web_grounded", False)
            grounding_sources = web_result.get("grounding_sources", [])
            logger.info(
                f"[Compliance Fusion] ✅ Web grounding: "
                f"{len(grounding_sources)} sources found"
            )
        except Exception as e:
            logger.warning(f"[Compliance Fusion] Web grounding skipped: {e}")

        # Merge web context into DEFA context for richer synthesis
        if web_context:
            context += f"\n\n--- LIVE WEB INTELLIGENCE (as of today) ---\n{web_context}"

        # ─── Qwen 2.5 Synthesis (Holy Trinity + Web Grounding) ─────
        result = await assess_compliance_fused(
            product=req.product,
            origin=req.origin,
            destination=req.destination,
            context_docs=context,
            wto_barriers=wto_barriers or {},
            logistics=logistics or {},
            financial=financial,
        )

        result["sources_used"] = len(documents)
        result["destination"] = req.destination
        result["web_grounded"] = web_grounded
        result["grounding_sources"] = grounding_sources

        logger.info(
            f"[Compliance Fusion] ✅ Done — friction={result.get('friction_score', '?')}, "
            f"level={result.get('friction_level', '?')}, web_grounded={web_grounded}"
        )

        return result

    except Exception as e:
        logger.error(f"[Compliance Fusion] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Compliance analysis failed: {str(e)}"
        )


