"""
Agentic WhatsApp Pipeline — Advancement 1
POST /api/webhook/whatsapp
POST /api/webhook/whatsapp/test  (mock endpoint for demo without Twilio)

Receives Twilio WhatsApp webhooks, identifies user by phone number,
agentically routes to OCR/ASR/text processing, extracts financial data
via Qwen 2.5, and persists to Convex in real-time.
"""

import os
import logging
from datetime import date

import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.ocr_engine import extract_text
from app.services.asr_engine import transcribe_audio
from app.services.qwen_llm import extract_ledger_data

logger = logging.getLogger(__name__)
router = APIRouter()

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")


def _get_convex_client():
    """Lazy Convex client — avoids module-level env var reads."""
    if not CONVEX_URL:
        return None
    from convex import ConvexClient
    return ConvexClient(CONVEX_URL)


def _reply_twiml(message: str) -> Response:
    """Build a TwiML XML response for Twilio WhatsApp replies."""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message>{message}</Message>"
        "</Response>"
    )
    return Response(content=xml, media_type="application/xml")


def _classify_intent(text: str) -> tuple[str, float]:
    """Keyword-based fallback classifier — PAYMENT_IN or CAPITAL_OUT."""
    text_lower = text.lower()

    inflow_kw = [
        "bayar", "paid", "transfer", "dah bayar", "payment",
        "terima", "received", "settled", "sudah", "bank in",
        "customer", "order", "tempah", "pesan",
    ]
    outflow_kw = [
        "beli", "bought", "purchase", "expenses", "modal", "bahan",
        "raw material", "inventory", "stok", "stock", "refund", "return",
        "bayar supplier", "kos", "cost", "sewa", "rent", "bil", "bill",
    ]

    p = sum(1 for k in inflow_kw if k in text_lower)
    o = sum(1 for k in outflow_kw if k in text_lower)

    if p == 0 and o == 0:
        return "PAYMENT_IN", 0.3
    if p >= o:
        return "PAYMENT_IN", min(0.95, 0.5 + p * 0.1)
    return "CAPITAL_OUT", min(0.95, 0.5 + o * 0.1)


async def _download_media(url: str) -> bytes:
    """Download media from Twilio URL (with auth)."""
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            auth=(account_sid, auth_token) if account_sid else None,
            follow_redirects=True,
        )
        resp.raise_for_status()
        return resp.content


async def _process_and_save(
    raw_text: str,
    clerk_id: str,
    source: str = "whatsapp",
    sender_context: str = "external",
) -> dict:
    """
    Core processing pipeline: LLM extract (with flow_type) → classify → save.
    sender_context: "self" (user sent it) or "external" (other contacts sent it).
    Classification priority: LLM flow_type > sender heuristic > keyword fallback.
    """
    if not raw_text or len(raw_text.strip()) < 3:
        return {"error": "Could not extract meaningful text from the message."}

    # Structured extraction via Qwen 2.5 (includes flow_type + type_confidence)
    extracted_data = await extract_ledger_data(raw_text, sender_context=sender_context)

    # Determine classification
    llm_flow = extracted_data.get("flow_type")
    llm_conf = float(extracted_data.get("type_confidence", 0))

    if llm_flow in ("PAYMENT_IN", "CAPITAL_OUT") and llm_conf >= 0.5:
        # LLM is confident enough
        classification = llm_flow
        confidence = llm_conf
    elif sender_context == "self":
        # User-sent messages default to outflow
        classification = "CAPITAL_OUT"
        confidence = 0.6
    elif sender_context == "external":
        # External contacts default to inflow
        classification = "PAYMENT_IN"
        confidence = 0.6
    else:
        # Final fallback: keyword classifier
        classification, confidence = _classify_intent(raw_text)

    # Autonomous Convex write
    convex = _get_convex_client()
    if convex:
        try:
            convex.mutation(
                "ledgers:insert",
                {
                    "clerkId": clerk_id,
                    "source": source,
                    "rawText": raw_text,
                    "classification": classification,
                    "confidence": confidence,
                    "itemDescription": extracted_data.get("item", "Unknown"),
                    "amountMyr": float(extracted_data.get("amount_myr", 0)),
                    "transactionDate": extracted_data.get("date", str(date.today())),
                    "sentiment": int(extracted_data.get("sentiment_1_to_10", 5)),
                },
            )
        except Exception as e:
            logger.warning(f"Convex save failed (non-blocking): {e}")

    return {
        "status": "success",
        "classification": classification,
        "confidence": confidence,
        "extracted_data": extracted_data,
        "raw_text": raw_text,
    }


# ─── Real Twilio Webhook ───────────────────────────────────────

@router.post("/whatsapp")
async def handle_whatsapp(request: Request):
    """
    Twilio WhatsApp webhook handler (Pipeline B — Demo).
    Pipeline: Identify user → Agentic route → Extract → Save → Reply
    """
    try:
        form = await request.form()
        sender = str(form.get("From", ""))        # "whatsapp:+60123456789"
        body = str(form.get("Body", ""))           # Text content
        num_media = int(form.get("NumMedia", 0))
        media_type = str(form.get("MediaContentType0", ""))
        media_url = str(form.get("MediaUrl0", ""))

        logger.info(f"[WhatsApp] Incoming — From: {sender}, Body: '{body[:80]}', Media: {num_media}")

        # 1. Identify user by phone number
        phone = sender.replace("whatsapp:", "")
        convex = _get_convex_client()

        if not convex:
            logger.error("[WhatsApp] Convex client unavailable — CONVEX_URL not set")
            return _reply_twiml("⚠️ System unavailable. Please try again later.")

        profile = None
        clerk_id = ""
        biz_name = ""
        is_owner = False

        try:
            profile = convex.query("profiles:getByPhone", {"phoneNumber": phone})
            logger.info(f"[WhatsApp] Phone lookup: {phone} → {'FOUND' if profile else 'NOT FOUND'}")
        except Exception as e:
            logger.warning(f"[WhatsApp] Phone lookup error: {e}")

        if profile:
            clerk_id = profile["clerkId"]
            biz_name = profile.get("businessName", "")
            # If the sender phone matches the registered profile phone, it's the owner
            is_owner = profile.get("phoneNumber", "") == phone
        else:
            # DEMO FALLBACK: Route unknown phones to the demo account
            demo_id = os.getenv("NEXT_PUBLIC_DEMO_CLERK_ID", "user_3AHz3NhmKaA32EFd5T3Sz4F28N9")
            clerk_id = demo_id
            biz_name = "Demo MSME"
            logger.info(f"[WhatsApp] Unregistered phone {phone} — routing to demo account: {demo_id}")

        # Determine sender context: self-sent (owner) → likely outflow, external → likely inflow
        sender_context = "self" if is_owner else "external"

        # 2. Agentic routing — payload type detection
        raw_text = ""

        if num_media > 0 and "audio" in media_type:
            # Voice note → ASR
            logger.info(f"[WhatsApp] Audio from {phone} — routing to ASR")
            audio_bytes = await _download_media(media_url)
            raw_text = await transcribe_audio(
                audio_bytes, filename="voice.ogg", language="ms"
            )

        elif num_media > 0 and "image" in media_type:
            # Image → OCR
            logger.info(f"[WhatsApp] Image from {phone} — routing to OCR")
            image_bytes = await _download_media(media_url)
            raw_text = extract_text(image_bytes)

        else:
            # Plain text → direct
            logger.info(f"[WhatsApp] Text from {phone}: '{body[:80]}'")
            raw_text = body

        if not raw_text or len(raw_text.strip()) < 3:
            logger.warning(f"[WhatsApp] Empty/short text — skipping processing")
            return _reply_twiml("⚠️ Could not extract text. Please send a clearer message or receipt.")

        # 3. Process and save (with sender context for flow classification)
        logger.info(f"[WhatsApp] Processing for clerk_id={clerk_id}, sender={sender_context}: '{raw_text[:80]}'")
        result = await _process_and_save(raw_text, clerk_id, source="whatsapp", sender_context=sender_context)

        if "error" in result:
            logger.warning(f"[WhatsApp] Processing error: {result['error']}")
            return _reply_twiml(f"⚠️ {result['error']}")

        logger.info(
            f"[WhatsApp] ✅ Saved — class={result['classification']}, "
            f"conf={result['confidence']}, item={result['extracted_data'].get('item')}, "
            f"amount=RM{result['extracted_data'].get('amount_myr')}"
        )

        # 4. WhatsApp confirmation reply
        amount = result["extracted_data"].get("amount_myr", 0)
        item = result["extracted_data"].get("item", "item")
        classification = result["classification"]

        emoji = {"PAYMENT_IN": "💰", "CAPITAL_OUT": "📤"}.get(
            classification, "📝"
        )
        flow_label = "Masuk (Inflow)" if classification == "PAYMENT_IN" else "Keluar (Outflow)"

        reply = (
            f"{emoji} Rekod disimpan!\n"
            f"Jenis: {flow_label}\n"
            f"Item: {item}\n"
            f"Jumlah: RM {amount}\n"
            f"---\nPINTAR.ai 🤖"
        )

        return _reply_twiml(reply)

    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}", exc_info=True)
        return _reply_twiml("⚠️ Processing error. Please try again.")


# ─── Mock Test Endpoint (for demo without Twilio) ─────────────

class MockWhatsAppMessage(BaseModel):
    phone_number: str = "+60123456789"
    message_type: str = "text"  # "text" | "image" | "audio"
    body: str = ""
    clerk_id: str = ""  # Override: skip phone lookup if provided


@router.post("/whatsapp/test")
async def test_whatsapp(msg: MockWhatsAppMessage):
    """
    Mock WhatsApp endpoint for demo/testing.
    Simulates the pipeline without Twilio.
    Supply clerk_id directly or register a phone number first.
    """
    clerk_id = msg.clerk_id

    # If no clerk_id given, try phone lookup
    if not clerk_id:
        convex = _get_convex_client()
        if convex:
            profile = convex.query(
                "profiles:getByPhone", {"phoneNumber": msg.phone_number}
            )
            if profile:
                clerk_id = profile["clerkId"]

    if not clerk_id:
        raise HTTPException(
            status_code=400,
            detail="No user found. Provide clerk_id or register phone number first.",
        )

    # Process the message
    result = await _process_and_save(msg.body, clerk_id, source="whatsapp")

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        **result,
        "whatsapp_reply": (
            f"✅ Rekod disimpan: RM {result['extracted_data'].get('amount_myr', 0)} "
            f"untuk {result['extracted_data'].get('item', 'item')}"
        ),
    }
