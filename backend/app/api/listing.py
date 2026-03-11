"""
Vernacular-to-Global Listing Generator API — Solution 2
POST /api/listing/generate
Converts dialect voice + product photo into bilingual SEO e-commerce listings.

Pipeline: Malaysia-AI ASR → rembg → Kimi-K2.5 (multimodal) → Convex save
"""

import os
import io
import base64
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image

from app.services.asr_engine import transcribe_audio
from app.services.qwen_llm import generate_listing_with_image

logger = logging.getLogger(__name__)
router = APIRouter()

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")


def get_convex_client():
    if not CONVEX_URL:
        return None
    from convex import ConvexClient
    return ConvexClient(CONVEX_URL)


def remove_background(image_bytes: bytes) -> bytes:
    """Remove background from product image using rembg."""
    try:
        from rembg import remove

        input_image = Image.open(io.BytesIO(image_bytes))
        output_image = remove(input_image)

        # Composite onto white background for e-commerce
        white_bg = Image.new("RGBA", output_image.size, (255, 255, 255, 255))
        white_bg.paste(output_image, mask=output_image.split()[3])
        result = white_bg.convert("RGB")

        output_buffer = io.BytesIO()
        result.save(output_buffer, format="PNG", quality=95)
        return output_buffer.getvalue()

    except ImportError:
        logger.warning("rembg not installed — returning original image")
        return image_bytes
    except Exception:
        return image_bytes


@router.post("/generate")
async def generate_product_listing(
    audio: UploadFile = File(...),
    image: UploadFile = File(...),
    msme_id: str = Form(...),
):
    """
    Generate a bilingual SEO e-commerce listing from voice + photo.

    Pipeline:
    1. Malaysia-AI ASR → transcribe dialect audio (Whisper-50TPS or Gemma3n)
    2. rembg → remove background, white product photo
    3. Kimi-K2.5 → multimodal generation (image + transcript → listing)
    4. Upload enhanced image to Convex Storage
    5. Save listing to Convex
    """
    try:
        # Step 1: Transcribe audio using Malaysia-AI ASR
        audio_bytes = await audio.read()
        transcript = await transcribe_audio(
            audio_bytes,
            filename=audio.filename or "audio.webm",
            language="ms",  # Default to Malay; auto-detects Iban/Foochow
        )

        if not transcript or len(transcript.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please speak clearly and try again.",
            )

        # Step 2: Process image — remove background
        image_bytes = await image.read()
        enhanced_image_bytes = remove_background(image_bytes)

        # Step 3: Encode image for Kimi-K2.5 multimodal input
        image_base64 = base64.b64encode(enhanced_image_bytes).decode("utf-8")

        # Step 4: Generate listing via Kimi-K2.5 (multimodal)
        listing_data = await generate_listing_with_image(transcript, image_base64)

        # Step 5: Save to Convex
        enhanced_image_url = None
        convex = get_convex_client()
        if convex:
            try:
                # Upload enhanced image to Convex file storage
                upload_url = convex.mutation("listings:generateUploadUrl")

                import httpx
                async with httpx.AsyncClient() as client:
                    upload_resp = await client.post(
                        upload_url,
                        content=enhanced_image_bytes,
                        headers={"Content-Type": "image/png"},
                    )
                    storage_id = upload_resp.json().get("storageId")

                if storage_id:
                    enhanced_image_url = convex.query(
                        "listings:getFileUrl", {"storageId": storage_id}
                    )

                convex.mutation(
                    "listings:insert",
                    {
                        "clerkId": msme_id,
                        "enhancedImageStorageId": storage_id if storage_id else None,
                        "transcript": transcript,
                        "titleEn": listing_data.get("title_en", ""),
                        "descEn": listing_data.get("desc_en", ""),
                        "titleZh": listing_data.get("title_zh", ""),
                        "descZh": listing_data.get("desc_zh", ""),
                        "seoTags": listing_data.get("tags", []),
                    },
                )
            except Exception as e:
                logger.warning(f"Convex save failed (non-blocking): {e}")

        return {
            "status": "success",
            "transcript": transcript,
            "enhanced_image_url": enhanced_image_url,
            "listing_data": listing_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Listing generation failed: {str(e)}"
        )


@router.get("/history/{msme_id}")
async def get_listing_history(msme_id: str):
    """Get listing history via Convex."""
    convex = get_convex_client()
    if not convex:
        return {"status": "success", "data": []}

    try:
        data = convex.query("listings:getByUser", {"clerkId": msme_id, "limit": 20})
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
