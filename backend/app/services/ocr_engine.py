"""
OCR Engine — Text extraction from images.
Primary: Tesseract OCR (if installed)
Fallback: EasyOCR (pip-installable, no system binary needed)
Handles receipt photos and WhatsApp chat screenshots.
"""

import io
import logging
from PIL import Image, ImageFilter, ImageEnhance

logger = logging.getLogger(__name__)

# Try importing OCR backends
_pytesseract = None
_easyocr_reader = None

try:
    import pytesseract
    _pytesseract = pytesseract
    logger.info("Tesseract OCR available")
except ImportError:
    logger.info("pytesseract not available — will try EasyOCR fallback")


def _get_easyocr_reader():
    """Lazy-load EasyOCR reader (cached after first call)."""
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(["en", "ms"], gpu=False)
            logger.info("EasyOCR reader loaded (en + ms)")
        except ImportError:
            raise RuntimeError(
                "Neither Tesseract nor EasyOCR is available. "
                "Install one: pip install easyocr  OR  install Tesseract binary"
            )
    return _easyocr_reader


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess image for better OCR accuracy.
    - Convert to grayscale
    - Increase contrast
    - Apply sharpening
    - Scale up small images
    """
    # Convert to grayscale
    img = image.convert("L")

    # Scale up if too small
    width, height = img.size
    if width < 800:
        scale = 800 / width
        img = img.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

    # Increase contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.8)

    # Sharpen
    img = img.filter(ImageFilter.SHARPEN)

    return img


def _extract_with_tesseract(processed: Image.Image) -> str:
    """Extract text using Tesseract OCR."""
    try:
        text = _pytesseract.image_to_string(processed, lang="eng+msa")
    except Exception:
        # Fallback to English only if Malay lang pack not available
        text = _pytesseract.image_to_string(processed, lang="eng")
    return text


def _extract_with_easyocr(image_bytes: bytes) -> str:
    """Extract text using EasyOCR (no system binary needed)."""
    reader = _get_easyocr_reader()
    results = reader.readtext(image_bytes, detail=0)  # detail=0 returns text only
    return "\n".join(results)


def extract_text(image_bytes: bytes) -> str:
    """
    Extract text from image bytes.
    Tries Tesseract first, falls back to EasyOCR.

    Args:
        image_bytes: Raw image file bytes

    Returns:
        Extracted text string
    """
    # Try Tesseract first (faster if available)
    if _pytesseract is not None:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            processed = preprocess_image(image)
            text = _extract_with_tesseract(processed)
            if text and len(text.strip()) >= 3:
                logger.info(f"Tesseract OCR extracted {len(text)} chars")
                # Clean up
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Tesseract failed, trying EasyOCR: {e}")

    # Fallback to EasyOCR
    try:
        text = _extract_with_easyocr(image_bytes)
        logger.info(f"EasyOCR extracted {len(text)} chars")
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"All OCR methods failed: {e}")
        raise RuntimeError(
            f"OCR extraction failed: {e}. "
            "Ensure either Tesseract or EasyOCR is installed."
        )
