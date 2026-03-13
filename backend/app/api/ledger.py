"""
Shadow-Ledger API — Solution 1
POST /api/ledger/analyze
Converts receipt/chat images into structured financial ledger entries.
Uses Convex for data storage.
"""

import os
import logging
from datetime import date

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.services.ocr_engine import extract_text
from app.services.qwen_llm import extract_ledger_data

logger = logging.getLogger(__name__)
router = APIRouter()

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")


def get_convex_client():
    """Get Convex Python client."""
    if not CONVEX_URL:
        return None
    from convex import ConvexClient
    return ConvexClient(CONVEX_URL)


def classify_intent(text: str) -> tuple[str, float]:
    """
    Keyword-based fallback classifier.
    Returns PAYMENT_IN (inflow) or CAPITAL_OUT (outflow) with confidence.
    """
    text_lower = text.lower()

    # Inflow keywords — money received
    inflow_keywords = [
        "bayar", "paid", "transfer", "dah bayar", "payment", "terima",
        "received", "settled", "sudah", "bank in", "customer", "order",
        "tempah", "pesan", "beli dari", "bought from us",
    ]
    # Outflow keywords — money spent
    outflow_keywords = [
        "beli", "bought", "purchase", "expenses", "modal", "bahan",
        "raw material", "inventory", "stok", "stock", "refund", "return",
        "bayar supplier", "kos", "cost", "sewa", "rent", "bil", "bill",
    ]

    inflow_score = sum(1 for k in inflow_keywords if k in text_lower)
    outflow_score = sum(1 for k in outflow_keywords if k in text_lower)

    if inflow_score == 0 and outflow_score == 0:
        return "PAYMENT_IN", 0.3  # Default to inflow if ambiguous

    if inflow_score >= outflow_score:
        return "PAYMENT_IN", min(0.95, 0.5 + inflow_score * 0.1)
    else:
        return "CAPITAL_OUT", min(0.95, 0.5 + outflow_score * 0.1)


@router.post("/analyze")
async def analyze_receipt(
    image: UploadFile = File(...),
    msme_id: str = Form(...),
    entry_type: str = Form(None),  # Optional: "PAYMENT_IN" or "CAPITAL_OUT"
):
    """
    Analyze a receipt/chat screenshot.
    Pipeline: OCR → Qwen extract (with flow_type) → Convex save
    If entry_type is provided by the user, it overrides LLM classification.
    """
    try:
        # Step 1: OCR
        image_bytes = await image.read()
        ocr_text = extract_text(image_bytes)

        if not ocr_text or len(ocr_text.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from image. Try a clearer photo.",
            )

        # Step 2: Extract structured data via Qwen (includes flow_type)
        extracted_data = await extract_ledger_data(ocr_text)

        # Step 3: Determine classification
        # Priority: user override > LLM flow_type > keyword fallback
        if entry_type in ("PAYMENT_IN", "CAPITAL_OUT"):
            classification = entry_type
            confidence = 1.0  # User explicitly chose
        elif extracted_data.get("flow_type") in ("PAYMENT_IN", "CAPITAL_OUT"):
            classification = extracted_data["flow_type"]
            confidence = float(extracted_data.get("type_confidence", 0.7))
        else:
            classification, confidence = classify_intent(ocr_text)

        # Step 4: Save to Convex
        convex = get_convex_client()
        if convex:
            try:
                convex.mutation(
                    "ledgers:insert",
                    {
                        "clerkId": msme_id,
                        "rawText": ocr_text,
                        "classification": classification,
                        "confidence": confidence,
                        "itemDescription": extracted_data.get("item", "Unknown"),
                        "amountMyr": float(extracted_data.get("amount_myr", 0)),
                        "transactionDate": extracted_data.get(
                            "date", str(date.today())
                        ),
                        "sentiment": int(
                            extracted_data.get("sentiment_1_to_10", 5)
                        ),
                    },
                )
            except Exception as e:
                logger.warning(f"Convex save failed (non-blocking): {e}")

        return {
            "status": "success",
            "ocr_text": ocr_text,
            "classification": classification,
            "confidence": confidence,
            "extracted_data": extracted_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Analysis failed: {str(e)}"
        )


@router.get("/history/{msme_id}")
async def get_ledger_history(msme_id: str):
    """Get ledger history via Convex."""
    convex = get_convex_client()
    if not convex:
        return {"status": "success", "data": []}

    try:
        data = convex.query("ledgers:getByUser", {"clerkId": msme_id, "limit": 50})
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{msme_id}")
async def get_ledger_summary(msme_id: str):
    """Get financial summary via Convex."""
    convex = get_convex_client()
    if not convex:
        return {
            "totalRevenue": 0,
            "totalOrders": 0,
            "totalComplaints": 0,
            "totalEntries": 0,
            "avgSentiment": 0,
            "reliabilityScore": 0,
        }

    try:
        return convex.query("ledgers:getSummary", {"clerkId": msme_id})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
