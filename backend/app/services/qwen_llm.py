"""
LLM Service — OpenRouter API Client
Handles Qwen 2.5 (text reasoning) and Kimi-K2.5 (multimodal image+text).
Both models accessed via the same OpenRouter API key.
"""

import os
import json
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# Model IDs on OpenRouter
QWEN_MODEL = "qwen/qwen-2.5-72b-instruct"
KIMI_MODEL = "moonshotai/kimi-k2.5"


def _get_api_key() -> str:
    """Read API key lazily so dotenv has time to load."""
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. "
            "Add it to backend/.env file."
        )
    return key


async def call_qwen(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    json_mode: bool = True,
) -> dict | str:
    """
    Call Qwen 2.5 via OpenRouter for text reasoning tasks.
    Used for: ledger extraction, compliance assessment.
    """
    return await _call_openrouter(
        model=QWEN_MODEL,
        system_prompt=system_prompt,
        user_content=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )


async def call_kimi_k25(
    system_prompt: str,
    user_text: str,
    image_base64: Optional[str] = None,
    image_media_type: str = "image/png",
    temperature: float = 0.4,
    max_tokens: int = 3000,
    json_mode: bool = True,
) -> dict | str:
    """
    Call Kimi-K2.5 via OpenRouter for multimodal image+text tasks.
    Used for: generating e-commerce listings from product photos + transcripts.
    """
    # Build multimodal content
    if image_base64:
        user_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image_media_type};base64,{image_base64}"
                },
            },
            {"type": "text", "text": user_text},
        ]
    else:
        user_content = user_text

    return await _call_openrouter(
        model=KIMI_MODEL,
        system_prompt=system_prompt,
        user_content=user_content,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )


async def _call_openrouter(
    model: str,
    system_prompt: str,
    user_content,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    json_mode: bool = True,
) -> dict | str:
    """Shared OpenRouter API caller for both Qwen and Kimi."""
    api_key = _get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pintar.ai",
        "X-Title": "PINTAR.ai",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
        response.raise_for_status()

    result = response.json()
    content = result["choices"][0]["message"]["content"]

    if json_mode:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)

    return content


# ============================================================
# Task-specific functions
# ============================================================

async def extract_ledger_data(ocr_text: str, sender_context: str = "unknown") -> dict:
    """Extract structured financial data from OCR text using Qwen 2.5."""
    system_prompt = """You are a financial data extraction AI for Sarawak MSMEs.
Extract structured data from this informal trade text.
The text may contain Manglish, Sarawak Malay, Iban, or Foochow words.

You MUST determine the flow direction of the transaction:
- PAYMENT_IN: Money received by the MSME (sales, customer payments, transfers in, income)
- CAPITAL_OUT: Money spent by the MSME (purchases, expenses, raw materials, inventory, refunds, bills)

To determine flow_type, consider:
1. Receipt remarks and context (e.g. "beli bahan" = outflow, "customer bayar" = inflow)
2. Keywords indicating direction (paid/received/bought/sold/refund)
3. If ambiguous, use sender_context hint if available

Always output valid JSON only."""

    user_prompt = f"""Text: "{ocr_text}"
Sender context: {sender_context}

Output ONLY valid JSON:
{{"date": "YYYY-MM-DD", "item": "string describing the product/service", "amount_myr": float, "sentiment_1_to_10": int, "flow_type": "PAYMENT_IN or CAPITAL_OUT", "type_confidence": float}}

Rules:
- If date is unclear, use today's date
- amount_myr must be a number (extract from RM mentions)
- sentiment: 1=very negative, 10=very positive (based on tone of message)
- item: describe what was bought/sold/ordered
- flow_type: PAYMENT_IN if money is received (inflow), CAPITAL_OUT if money is spent (outflow)
- type_confidence: 0.0 to 1.0 — your confidence in the flow_type classification"""

    return await call_qwen(system_prompt, user_prompt, temperature=0.1)


async def categorize_transactions(transactions: list[dict]) -> dict:
    """
    Takes an array of clean transactions (Date, Desc, Debit, Credit) and uses NLP 
    to categorize them into standard financial buckets for deeper analysis.
    """
    system_prompt = """You are an expert SME financial analyst.
You categorize raw bank transactions into accounting buckets to help analyze
expense ratios, debt obligations, and revenue quality. Output ONLY valid JSON."""

    # We only send essential info to save tokens
    condensed = []
    for t in transactions:
        condensed.append(f"{t['date']} | {t['description']} | In: {t['credit']} | Out: {t['debit']}")
        
    user_prompt = f"""Here are the recent bank transactions:\n\n"
{char_limit_condensed: string = chr(10).join(condensed)[:6000]}
"\n\n
Analyze these transactions and output ONLY valid JSON containing an array of categories:
{{
  "categorized_transactions": [
    {{
      "date": "YYYY-MM-DD",
      "description": "...",
      "inflow": float,
      "outflow": float,
      "category": "revenue_sales | revenue_other | fixed_expense | variable_expense | debt_repayment | bank_charge | owner_draw | bounce_fee"
    }}
  ],
  "summary": {{
    "total_fixed_expenses": float,
    "total_variable_expenses": float,
    "total_debt_payments": float,
    "total_revenue_sales": float,
    "total_bank_charges": float
  }}
}}
"""
    return await call_qwen(system_prompt, user_prompt, temperature=0.1)


async def generate_listing_with_image(
    transcript: str, image_base64: Optional[str] = None
) -> dict:
    """
    Generate bilingual SEO e-commerce listing using Kimi-K2.5 multimodal.
    Takes both voice transcript AND product photo for richer output.
    """
    system_prompt = """You are a professional Shopee/Lazada listing copywriter specializing in
Sarawak/Borneo handmade and agricultural products.
Generate culturally authentic, SEO-optimized listings.
When a product photo is provided, describe what you see and incorporate visual details.
Always output valid JSON only."""

    user_prompt = f"""User's voice description (may contain Iban, Foochow, Sarawak Malay):
"{transcript}"

{"A product photo is attached — incorporate visual details (color, texture, size, packaging) into the listing." if image_base64 else "No photo provided."}

Generate a professional, SEO-optimized e-commerce listing.
Include cultural context and authenticity as selling points.

Output ONLY valid JSON:
{{
  "title_en": "Professional English title (max 80 chars)",
  "desc_en": "English description (150-300 words, include origin story, materials, craftsmanship)",
  "title_zh": "Mandarin Chinese title (max 40 chars)",
  "desc_zh": "Mandarin Chinese description (100-200 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}"""

    return await call_kimi_k25(
        system_prompt, user_prompt, image_base64=image_base64, temperature=0.5
    )


async def generate_listing(transcript: str) -> dict:
    """Backward-compatible text-only listing generation (uses Qwen)."""
    return await generate_listing_with_image(transcript, image_base64=None)


async def assess_compliance(
    product: str, origin: str, destination: str, context_docs: str
) -> dict:
    """Assess cross-border compliance using RAG context (Qwen 2.5)."""
    system_prompt = """You are an ASEAN cross-border trade compliance advisor specializing in
Sarawak/Borneo exports. You provide practical, actionable guidance for MSMEs.
Base your assessment ONLY on the provided reference documents.
Always output valid JSON only."""

    user_prompt = f"""Using the following official ASEAN DEFA and customs documents as reference:

--- CONTEXT START ---
{context_docs}
--- CONTEXT END ---

User Query: Can an MSME ship "{product}" from {origin} to {destination}?

Provide a compliance assessment. Output ONLY valid JSON:
{{
  "status": "green|yellow|red",
  "summary": "One-line verdict in simple language",
  "guidance": "Detailed markdown guidance with numbered steps",
  "requirements": ["Requirement 1", "Requirement 2"],
  "hs_code_estimation": "XXXX.XX",
  "estimated_duties": "X% or De-minimis exempt",
  "warnings": ["Warning if any"]
}}

Status meanings:
- green: Allowed, straightforward process
- yellow: Allowed with conditions/permits required
- red: Restricted or prohibited, significant barriers"""

    return await call_qwen(system_prompt, user_prompt, temperature=0.2)


async def assess_compliance_fused(
    product: str,
    origin: str,
    destination: str,
    context_docs: str,
    wto_barriers: dict,
    logistics: dict,
    financial: dict,
) -> dict:
    """
    Enhanced compliance assessment fusing 3 data streams:
    1. DEFA regulatory context (RAG)
    2. WTO SPS/TBT barriers (live/mock)
    3. FRED logistics trends + MSME financial reality
    """
    system_prompt = """You are an elite ASEAN cross-border trade strategist for Sarawak MSMEs.
You synthesize regulatory frameworks, live trade barriers, logistics costs, and the MSME's
actual financial position to produce actionable intelligence. Output ONLY valid JSON."""

    user_prompt = f"""INTELLIGENCE BRIEF — Export Route Analysis

TARGET ROUTE: {product} from {origin} → {destination}

═══ DATA STREAM 1: REGULATORY FRAMEWORK (DEFA) ═══
{context_docs}

═══ DATA STREAM 2: LIVE TRADE BARRIERS (WTO SPS/TBT) ═══
SPS Alerts: {wto_barriers.get('sps_alerts', [])}
TBT Barriers: {wto_barriers.get('tbt_barriers', [])}
Base Friction Score: {wto_barriers.get('friction_base', 0)}/100
De-Minimis Threshold: USD {wto_barriers.get('de_minimis_usd', 'N/A')}
Avg Customs Clearance: {wto_barriers.get('avg_clearance_days', 'N/A')} days

═══ DATA STREAM 3: LOGISTICS & FINANCIAL REALITY ═══
Freight Index: {logistics.get('freight_index', 100)} (trend: {logistics.get('freight_trend', 'stable')}, {logistics.get('freight_trend_pct', 0):+.1f}%)
Avg Transit: {logistics.get('avg_transit_days', 'N/A')} days
Shipping Cost: RM {logistics.get('shipping_cost_per_kg_myr', 0)}/kg
Port: {logistics.get('port', 'N/A')}

MSME 30-Day Revenue: RM {financial.get('revenue_30d', 0):,.0f}
MSME Liquidity Status: {financial.get('liquidity_status', 'unknown')}
MSME Total Cash Flow: RM {financial.get('total_revenue', 0):,.0f}

═══ ANALYSIS REQUIRED ═══
Produce a comprehensive trade intelligence assessment. Output ONLY valid JSON:
{{
  "friction_score": <integer 0-100, combining regulatory + logistics + financial risk>,
  "friction_level": "green|yellow|red",
  "barriers": [
    {{"type": "SPS|TBT|CUSTOMS", "description": "...", "severity": "low|medium|high", "mitigation": "..."}}
  ],
  "logistics": {{
    "freight_index": <number>,
    "trend": "stable|rising|falling",
    "trend_pct": <number>,
    "avg_days": <number>,
    "cost_per_kg_myr": <number>,
    "cost_impact": "<percentage string like '+4%'>"
  }},
  "defa_compliance": {{
    "status": "green|yellow|red",
    "summary": "One-line DEFA verdict",
    "requirements": ["Req 1", "Req 2"],
    "de_minimis": "...",
    "hs_code": "XXXX.XX",
    "estimated_duties": "X% or De-minimis exempt"
  }},
  "financial_feasibility": {{
    "cash_available_myr": <number>,
    "estimated_export_cost_myr": <number>,
    "can_absorb": <boolean>,
    "ratio_pct": <percentage of revenue this export costs>
  }},
  "strategic_verdict": "<2-3 sentence actionable recommendation referencing specific numbers>",
  "warnings": ["Warning if any"]
}}

Friction level: green=0-30, yellow=31-60, red=61-100"""

    return await call_qwen(system_prompt, user_prompt, temperature=0.2)
