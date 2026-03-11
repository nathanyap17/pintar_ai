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
    Classify transaction intent using DistilBERT (if model available)
    or keyword fallback.
    """
    text_lower = text.lower()

    # Keyword-based fallback classifier
    payment_keywords = [
        "bayar", "paid", "transfer", "dah bayar", "payment", "rm",
        "terima", "received", "settled", "sudah", "bank in",
    ]
    order_keywords = [
        "order", "mau", "nak", "book", "beli", "want", "kirim",
        "tempah", "pesan", "hantar", "send",
    ]
    complaint_keywords = [
        "rosak", "broken", "complaint", "marah", "refund", "return",
        "problem", "issue", "salah", "wrong", "bad",
    ]

    payment_score = sum(1 for k in payment_keywords if k in text_lower)
    order_score = sum(1 for k in order_keywords if k in text_lower)
    complaint_score = sum(1 for k in complaint_keywords if k in text_lower)

    max_score = max(payment_score, order_score, complaint_score)
    if max_score == 0:
        return "ORDER_IN", 0.3

    if payment_score == max_score:
        return "PAYMENT_IN", min(0.95, 0.5 + payment_score * 0.1)
    elif complaint_score == max_score:
        return "COMPLAINT", min(0.95, 0.5 + complaint_score * 0.1)
    else:
        return "ORDER_IN", min(0.95, 0.5 + order_score * 0.1)


@router.post("/analyze")
async def analyze_receipt(
    image: UploadFile = File(...),
    msme_id: str = Form(...),
):
    """
    Analyze a receipt/chat screenshot.
    Pipeline: OCR → DistilBERT/keyword classify → Qwen extract → Convex save
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

        # Step 2: Classify intent
        classification, confidence = classify_intent(ocr_text)

        # Step 3: Extract structured data via Qwen
        extracted_data = await extract_ledger_data(ocr_text)

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
