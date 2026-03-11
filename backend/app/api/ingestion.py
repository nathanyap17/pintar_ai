"""
Native WhatsApp Ingestion API — Pipeline A
POST /api/internal/ingest-native

Receives transaction payloads from the WhatsApp Node.js microservice.
Processes them through the same classify → extract → save pipeline
as the Twilio webhook (Pipeline B), ensuring data consistency.

Security: Protected by X-Internal-Key header check.
"""

import os
import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

# Import shared processing core from whatsapp module
from app.api.whatsapp import _process_and_save

logger = logging.getLogger(__name__)
router = APIRouter()

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "pintar-internal-dev")


class NativeIngestPayload(BaseModel):
    clerk_id: str
    message_body: str = ""
    media_base64: Optional[str] = None
    media_type: Optional[str] = None  # "image/jpeg", "audio/ogg", etc.
    sender: Optional[str] = None
    timestamp: Optional[int] = None


@router.post("/ingest-native")
async def ingest_native_whatsapp(
    payload: NativeIngestPayload,
    x_internal_key: str = Header(default=""),
):
    """
    Receives intercepted WhatsApp messages from the Node.js microservice.
    Pipeline: OCR/ASR (if media) → classify → extract (Qwen 2.5) → save to Convex
    """

    # ─── Security Check ──────────────────────────────────────
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")

    preview = payload.message_body[:60] if payload.message_body else ""
    logger.info(
        f"[Native Ingest] From {payload.sender} for {payload.clerk_id}: "
        f'"{preview}..." (media: {payload.media_type})'
    )

    raw_text = payload.message_body

    # ─── Media Processing ────────────────────────────────────
    media_b64: str = payload.media_base64 or ""
    media_mime: str = payload.media_type or ""

    if media_b64 and media_mime:
        try:
            media_bytes = base64.b64decode(media_b64)

            if media_mime.startswith("image"):
                # OCR: Extract text from receipt/invoice image
                try:
                    import easyocr
                    import io
                    from PIL import Image
                    import numpy as np

                    image = Image.open(io.BytesIO(media_bytes)).convert("RGB")
                    reader = easyocr.Reader(["en", "ms"], gpu=False)
                    results = reader.readtext(np.array(image))
                    ocr_text = " ".join([r[1] for r in results])
                    raw_text = f"{payload.message_body} | Receipt OCR: {ocr_text}"
                    logger.info(f"[OCR] Extracted {len(ocr_text)} chars from image")
                except Exception as e:
                    logger.warning(f"[OCR] Failed: {e}")

            elif media_mime.startswith("audio"):
                # ASR: Transcribe voice note
                # For now, log and use message body only
                # TODO: Integrate Malaysia-AI Whisper when available
                logger.info("[ASR] Audio received — transcription not yet implemented")

        except Exception as e:
            logger.warning(f"[Media] Processing failed: {e}")

    # ─── Core Processing Pipeline ────────────────────────────
    # Reuses the exact same function as the Twilio webhook
    result = await _process_and_save(
        raw_text=raw_text,
        clerk_id=payload.clerk_id,
        source="native",  # Distinguishes from "whatsapp" (Twilio) and "web"
    )

    return {
        "status": "success",
        "source": "native",
        "sender": payload.sender,
        **result,
    }
