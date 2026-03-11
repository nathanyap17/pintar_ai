"""
Malaysian AI ASR Engine — Speech-to-Text Service
Replaces paid OpenAI Whisper API with open-source Malaysian AI models.

Primary: malaysia-ai/whisper-50TPS-VQ-32k-large-v3-turbo
Enhanced: mesolitica/gemma3n-audio-encoder-whisper-decoder

These models are fine-tuned on Malaysian languages including:
Malay, Manglish, Iban, Sarawak Malay, Foochow, and 100+ other languages.
"""

import io
import logging
import tempfile
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-loaded model instances (cached after first call)
_whisper_model = None
_whisper_feature_extractor = None
_whisper_tokenizer = None
_gemma3n_model = None
_gemma3n_feature_extractor = None
_gemma3n_tokenizer = None


def _convert_audio_to_wav(audio_bytes: bytes, filename: str) -> bytes:
    """
    Convert audio from any format (webm, ogg, mp4, m4a) to WAV using pydub.
    Returns WAV bytes that librosa can always decode.
    """
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    # If already wav, return as-is
    if ext in ("wav", "wave"):
        return audio_bytes

    try:
        from pydub import AudioSegment

        # Write input to temp file (pydub needs file path for some formats)
        with tempfile.NamedTemporaryFile(suffix=f".{ext or 'webm'}", delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        try:
            # pydub + ffmpeg handles webm, ogg, mp4, m4a, etc.
            audio = AudioSegment.from_file(tmp_in_path)
            # Export as 16kHz mono WAV (optimal for ASR models)
            audio = audio.set_frame_rate(16000).set_channels(1)

            wav_buffer = io.BytesIO()
            audio.export(wav_buffer, format="wav")
            wav_bytes = wav_buffer.getvalue()

            logger.info(
                f"Converted {ext} → WAV: {len(audio_bytes)} → {len(wav_bytes)} bytes, "
                f"{len(audio)}ms duration"
            )
            return wav_bytes
        finally:
            os.unlink(tmp_in_path)

    except ImportError:
        logger.warning("pydub not installed — trying raw librosa decode")
        return audio_bytes
    except Exception as e:
        logger.warning(f"pydub conversion failed ({e}) — trying raw librosa decode")
        return audio_bytes


def _load_whisper_model():
    """Load the Malaysia-AI Whisper model (lazy, first call only)."""
    global _whisper_model, _whisper_feature_extractor, _whisper_tokenizer

    if _whisper_model is not None:
        return

    logger.info("Loading Malaysia-AI Whisper model (3.4GB, first load takes ~30s)...")

    from transformers import AutoFeatureExtractor, AutoModelForSpeechSeq2Seq, AutoTokenizer

    model_id = "mesolitica/whisper-50TPS-VQ-32k-large-v3-turbo"

    _whisper_feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)
    _whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, trust_remote_code=False, torch_dtype="auto"
    )
    _whisper_tokenizer = AutoTokenizer.from_pretrained(model_id)

    # Move to GPU if available
    try:
        import torch
        if torch.cuda.is_available():
            _whisper_model = _whisper_model.cuda()
            logger.info("Whisper model loaded on CUDA GPU")
        else:
            logger.info("Whisper model loaded on CPU (slower inference)")
    except Exception:
        logger.info("Whisper model loaded on CPU")


def _load_gemma3n_model():
    """Load the Gemma3n audio encoder + Whisper decoder model."""
    global _gemma3n_model, _gemma3n_feature_extractor, _gemma3n_tokenizer

    if _gemma3n_model is not None:
        return

    logger.info("Loading Gemma3n audio encoder model...")

    from transformers import AutoFeatureExtractor, AutoModel, AutoTokenizer

    model_id = "mesolitica/gemma3n-audio-encoder-whisper-decoder"

    _gemma3n_feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)
    _gemma3n_model = AutoModel.from_pretrained(
        model_id, trust_remote_code=True, torch_dtype="auto"
    )
    _gemma3n_tokenizer = AutoTokenizer.from_pretrained(model_id)

    try:
        import torch
        if torch.cuda.is_available():
            _gemma3n_model = _gemma3n_model.cuda()
            logger.info("Gemma3n model loaded on CUDA GPU")
        else:
            logger.info("Gemma3n model loaded on CPU")
    except Exception:
        logger.info("Gemma3n model loaded on CPU")


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "ms",
    use_gemma3n: bool = False,
) -> str:
    """
    Transcribe audio using Malaysia-AI models.

    Args:
        audio_bytes: Raw audio file bytes (webm, ogg, wav, mp4, m4a)
        filename: Original filename (for format detection)
        language: Language code for decoder (ms=Malay, iba=Iban, etc.)
        use_gemma3n: If True, use Gemma3n encoder for enhanced transcription

    Returns:
        Transcribed text string
    """
    import librosa
    import numpy as np
    import torch

    # Step 1: Convert audio to WAV if needed (handles webm, ogg, etc.)
    wav_bytes = _convert_audio_to_wav(audio_bytes, filename)

    # Step 2: Load audio via librosa
    audio_buffer = io.BytesIO(wav_bytes)

    try:
        # librosa handles WAV natively; other formats need ffmpeg
        y, sr = librosa.load(audio_buffer, sr=16000)
    except Exception as e:
        logger.error(f"Failed to load audio: {e}")
        raise ValueError(
            f"Could not load audio file '{filename}': {e}. "
            "Make sure ffmpeg is installed for non-WAV formats."
        )

    if len(y) < 1600:  # Less than 0.1 seconds
        raise ValueError("Audio too short — please record at least 1 second")

    if use_gemma3n:
        return _transcribe_with_gemma3n(y, language)
    else:
        return _transcribe_with_whisper(y, language)


def _transcribe_with_whisper(y, language: str) -> str:
    """Transcribe using Malaysia-AI Whisper model."""
    import torch

    _load_whisper_model()

    # Prepare language tag for decoder
    lang_tag = f"<|startoftranscript|><|{language}|><|transcribe|><|notimestamps|>"

    input_ids = _whisper_tokenizer(
        lang_tag, add_special_tokens=False, return_tensors="pt"
    )["input_ids"]

    features = _whisper_feature_extractor(
        [y], return_tensors="pt", return_attention_mask=True
    )

    # Build generation kwargs
    gen_kwargs = dict(
        input_features=features["input_features"],
        attention_mask=features.get("attention_mask", features.get("input_features_mask")),
        decoder_input_ids=input_ids,
        max_new_tokens=400, # Whisper limit is 448 total tokens
    )

    # Move tensors to device
    device = next(_whisper_model.parameters()).device
    for k, v in gen_kwargs.items():
        if hasattr(v, "to"):
            gen_kwargs[k] = v.to(device)

    with torch.no_grad():
        output = _whisper_model.generate(**gen_kwargs)

    # Decode and clean
    text = _whisper_tokenizer.decode(output[0], skip_special_tokens=True).strip()

    logger.info(f"Whisper transcription ({len(y)/16000:.1f}s audio): {text[:80]}...")
    return text


def _transcribe_with_gemma3n(y, language: str) -> str:
    """Transcribe using Gemma3n audio encoder + Whisper decoder."""
    import torch

    _load_gemma3n_model()

    lang_tag = f"<|startoftranscript|><|{language}|><|transcribe|><|notimestamps|>"

    input_ids = _gemma3n_tokenizer(
        lang_tag, add_special_tokens=False, return_tensors="pt"
    )["input_ids"]

    features = _gemma3n_feature_extractor([y], return_tensors="pt")

    gen_kwargs = dict(
        input_features=features["input_features"],
        decoder_input_ids=input_ids,
        max_new_tokens=1024,
        temperature=0.1,
        do_sample=True,
    )

    # Handle attention mask
    if "input_features_mask" in features:
        gen_kwargs["input_features_mask"] = features["input_features_mask"]
        gen_kwargs["attention_mask"] = features["input_features_mask"]

    device = next(_gemma3n_model.parameters()).device
    for k, v in gen_kwargs.items():
        if hasattr(v, "to"):
            gen_kwargs[k] = v.to(device)

    with torch.no_grad():
        output = _gemma3n_model.generate(**gen_kwargs)

    text = _gemma3n_tokenizer.decode(output[0], skip_special_tokens=True).strip()

    logger.info(f"Gemma3n transcription ({len(y)/16000:.1f}s audio): {text[:80]}...")
    return text


# Supported language codes for decoder
SUPPORTED_LANGUAGES = {
    "ms": "Malay",
    "en": "English",
    "zh": "Chinese",
    "id": "Indonesian",
    "iba": "Iban",
    "ta": "Tamil",
    "ja": "Japanese",
    "ko": "Korean",
    "th": "Thai",
    "vi": "Vietnamese",
    "tl": "Tagalog",
}
