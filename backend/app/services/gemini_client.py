"""
AI Client — OpenRouter Vision + SerpAPI Search
Replaces Gemini 2.5 Flash with:
- call_gemini_flash() → Qwen 2.5-VL via OpenRouter (PDF→images→vision)
- call_gemini_with_search() → SerpAPI + Qwen 2.5 synthesis
"""

import os
import json
import base64
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
VISION_MODEL = "qwen/qwen3-vl-32b-instruct"
TEXT_MODEL = "qwen/qwen-2.5-72b-instruct"


def _get_api_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "")


def _pdf_to_images(pdf_bytes: bytes) -> list[str]:
    """Convert PDF pages to base64-encoded PNG images using PyMuPDF."""
    import fitz  # PyMuPDF

    b64_images = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for page_num in range(min(len(doc), 5)):  # Max 5 pages
        page = doc.load_page(page_num)
        # Render at 150 DPI for good quality without being too large
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        b64_images.append(base64.b64encode(img_bytes).decode())

    doc.close()
    return b64_images


async def call_gemini_flash(
    prompt: str,
    pdf_bytes: Optional[bytes] = None,
    json_mode: bool = True,
) -> dict:
    """
    Call Qwen 2.5-VL via OpenRouter for text or PDF vision tasks.
    If pdf_bytes is provided, converts PDF pages to images and sends
    them as vision content to Qwen 2.5-VL.

    Drop-in replacement for the original Gemini Flash function.
    """
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    # Build message content
    content = []

    if pdf_bytes:
        # Convert PDF → images → base64
        try:
            images = _pdf_to_images(pdf_bytes)
            logger.info(f"[Vision] Converted PDF to {len(images)} page images")
            for img_b64 in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                })
        except Exception as e:
            logger.error(f"[Vision] PDF conversion failed: {e}")
            raise

    content.append({"type": "text", "text": prompt})

    payload = {
        "model": VISION_MODEL if pdf_bytes else TEXT_MODEL,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"].strip()

        if json_mode:
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text
                if text.endswith("```"):
                    text = text[:-3].strip()
                if text.startswith("json"):
                    text = text[4:].strip()
            return json.loads(text)

        return {"text": text}

    except Exception as e:
        logger.error(f"[Vision] OpenRouter error: {e}", exc_info=True)
        raise


async def call_gemini_with_search(prompt: str) -> dict:
    """
    SerpAPI web search + Qwen 2.5 synthesis.
    Replaces Gemini's native Google Search grounding.

    1. Search Google via SerpAPI for live results
    2. Feed search snippets into Qwen 2.5 for synthesis
    3. Return response text + grounding sources
    """
    api_key = _get_api_key()
    serp_key = os.getenv("SERPAPI_KEY", "")

    if not serp_key:
        logger.warning("[Search] SERPAPI_KEY not set — falling back to text-only")
        return await _text_only_fallback(prompt, api_key)

    # Step 1: SerpAPI Google search
    grounding_sources = []
    search_context = ""

    try:
        from serpapi import GoogleSearch

        search = GoogleSearch({
            "q": prompt[:200],  # Truncate prompt for search query
            "api_key": serp_key,
            "num": 5,
            "gl": "my",  # Malaysia
            "hl": "en",
        })
        results = search.get_dict()

        # Extract organic results
        organic = results.get("organic_results", [])
        for r in organic[:5]:
            title = r.get("title", "")
            snippet = r.get("snippet", "")
            link = r.get("link", "")
            grounding_sources.append({"title": title, "uri": link})
            search_context += f"- {title}: {snippet}\n"

        # Also include answer box if available
        answer_box = results.get("answer_box", {})
        if answer_box:
            search_context += f"\nFeatured answer: {answer_box.get('answer', answer_box.get('snippet', ''))}\n"

        logger.info(f"[Search] SerpAPI returned {len(organic)} results")

    except Exception as e:
        logger.warning(f"[Search] SerpAPI error: {e}")

    # Step 2: Synthesize with Qwen 2.5
    synthesis_prompt = f"""Based on the following live web search results, answer this question:

QUESTION: {prompt}

SEARCH RESULTS:
{search_context if search_context else "No search results available."}

Provide a comprehensive, factual answer based on the search results. Cite specific sources where possible."""

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": TEXT_MODEL,
                    "messages": [{"role": "user", "content": synthesis_prompt}],
                    "temperature": 0.3,
                    "max_tokens": 4096,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"].strip()

        return {
            "text": text,
            "web_grounded": len(grounding_sources) > 0,
            "grounding_sources": grounding_sources,
        }

    except Exception as e:
        logger.error(f"[Search] Qwen synthesis error: {e}", exc_info=True)
        raise


async def _text_only_fallback(prompt: str, api_key: str) -> dict:
    """Fallback: just ask Qwen without search context."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": TEXT_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 4096,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        return {
            "text": data["choices"][0]["message"]["content"].strip(),
            "web_grounded": False,
            "grounding_sources": [],
        }
    except Exception as e:
        logger.error(f"[Fallback] Error: {e}")
        raise


async def call_audit_ai(metrics: dict, profile: dict) -> dict:
    """
    AI Audit Engine — generates audit status, strategic summary,
    prioritized weaknesses (ranked by drag %), and optimization pathways.

    Uses Qwen 2.5-72B text model.
    """
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    prompt = f"""You are PINTAR.ai's Financial Eligibility Audit Engine for Malaysian MSMEs.

Given these parsed bank statement metrics and business profile, generate a comprehensive audit report.

## METRICS
- Net Cash Flow: RM{metrics.get('net_cash_flow', 0):,.2f}/month
- DSCR: {metrics.get('dscr', 0):.2f}x (target: >1.25x)
- Expense Ratio: {metrics.get('expense_ratio', 0):.1f}% (threshold: <70%)
- Revenue Consistency: {metrics.get('revenue_consistency', 0):.1f}% variance (flag if >30%)
- Avg Monthly Balance: RM{metrics.get('avg_monthly_balance', 0):,.2f}
- Overdrafts: {metrics.get('overdraft_count', 0)} in trailing period
- Proxy Score: {metrics.get('proxy_score', 0)} (scale: 300–850)
- Eligibility Index: {metrics.get('eligibility_index', 0)}%
- ADB: RM{metrics.get('adb', 0):,.2f}
- DSR: {metrics.get('dsr', 0):.1f}%
- Volatility: {metrics.get('volatility', 0)}
- Bounced Transactions: {metrics.get('bounce_count', 0)}

## BUSINESS PROFILE
- Business Type: {profile.get('business_type', 'Unknown')}
- Years Operating: {profile.get('years_operating', 'Unknown')}
- Annual Turnover: RM{profile.get('annual_turnover', 0):,.0f}
- Loan Purpose: {profile.get('loan_purpose', 'Unknown')}
- Projected Revenue (12m): RM{profile.get('projected_revenue', 0):,.0f}
- Total Assets: RM{profile.get('total_assets', 0):,.0f}

## GENERATE (strict JSON):
{{
  "audit_status": "Eligible" | "Borderline – Needs Improvement" | "Not Eligible – Significant Gaps",
  "audit_color": "green" | "amber" | "red",
  "strategic_summary": "<1 sentence summarizing key finding, e.g. 'Strong revenue consistency but high expense-to-revenue ratio.'>",
  "weaknesses": [
    {{
      "title": "<short title, e.g. 'Expense Ratio Elevated'>",
      "description": "<1-2 sentences explaining impact, e.g. 'Current ratio (82%) is 12% above industry benchmark.'>",
      "drag_pct": <integer 0-100, how much this drags the overall score>
    }}
  ],
  "optimizations": [
    {{
      "title": "<action title, e.g. 'Optimize Expense Ratio'>",
      "steps": ["<step 1>", "<step 2>"],
      "target_weakness": "<matching weakness title>"
    }}
  ]
}}

Return ONLY valid JSON. Generate 3-5 weaknesses ranked by drag_pct (highest first). Generate 1 optimization per weakness. Be specific to MSME context."""

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": TEXT_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 4096,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text
            if text.endswith("```"):
                text = text[:-3].strip()
            if text.startswith("json"):
                text = text[4:].strip()

        return json.loads(text)

    except Exception as e:
        logger.error(f"[Audit AI] Error: {e}", exc_info=True)
        # Fallback: return deterministic defaults
        return {
            "audit_status": "Borderline – Needs Improvement",
            "audit_color": "amber",
            "strategic_summary": "Analysis completed with limited AI insights. Review metrics manually.",
            "weaknesses": [],
            "optimizations": [],
        }

