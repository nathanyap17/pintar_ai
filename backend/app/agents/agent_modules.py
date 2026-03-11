"""
Snap & Sell 2.0 — Individual Agent Modules
Each agent is a pure function that takes state in and returns updated state.
These are composed into a LangGraph StateGraph.

Pipeline (7 agents):
  1. Transcription (Whisper ASR)
  2. Vision Analysis (Kimi-K2.5)
  3. Director Script Writer (Qwen 2.5-72B) ★ ONE cinematic prompt + 2 subtitles
  4. Background Removal (rembg) — isolate product before LTX
  5. LTX-2.3 Video Generation (HF Space) ★ SINGLE call → one 8s clip
  6. Subtitle Generator — hardcoded mathematical timing for 2 subtitle phrases
  7. Video Assembler — overlay subtitles on single clip → final MP4
"""

import os
import json
import logging
import base64
import time
import asyncio
from typing import TypedDict, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")

# ── Global step tracker ──────────────────────────────────────
# LangGraph copies state between nodes, so state["current_step"] doesn't
# propagate back to the caller mid-execution. This global dict (keyed by
# clerk_id) is updated directly by each agent for real-time progress.
_step_tracker: dict[str, str] = {}


def get_current_step(clerk_id: str) -> str:
    """Get the current pipeline step for a given user."""
    return _step_tracker.get(clerk_id, "queued")


def _set_step(state, step: str):
    """Update both the state and the global tracker."""
    state["current_step"] = step
    cid = state.get("clerk_id", "")
    if cid:
        _step_tracker[cid] = step

# ═══════════════════════════════════════════════════════════════
#  Shared State Definition
# ═══════════════════════════════════════════════════════════════

class AdState(TypedDict):
    """State passed between agents in the LangGraph pipeline."""
    # Input
    product_image_path: str
    voice_audio_path: Optional[str]
    clerk_id: str
    listing_id: Optional[str]

    # Agent outputs
    transcript: Optional[str]                # Agent 1: Whisper ASR
    product_analysis: Optional[dict]         # Agent 2: Kimi-K2.5 vision
    script: Optional[str]                    # Agent 3: Combined subtitle text
    director_script: Optional[str]           # Agent 3: Single cinematic prompt for LTX
    caption: Optional[str]                   # Agent 3: Social media caption
    hashtags: Optional[List[str]]            # Agent 3: Hashtags
    isolated_product_path: Optional[str]     # Agent 4: rembg output
    video_clips: Optional[List[str]]         # Agent 5: LTX-generated clip path(s)
    subtitle_data: Optional[List[dict]]      # Agent 6: Timed subtitle entries
    video_path: Optional[str]                # Agent 7: Final assembled video

    # Metadata
    status: str
    current_step: Optional[str]              # For frontend progress tracking
    error: Optional[str]
    platform: str                            # "tiktok" | "instagram" | "whatsapp"
    language: str                            # "ms" | "en" | "zh"

    # Legacy (kept for backward compat)
    storyboard: Optional[List[dict]]


# ═══════════════════════════════════════════════════════════════
#  Agent 1: Transcription (Whisper ASR)
# ═══════════════════════════════════════════════════════════════

async def transcription_agent(state: AdState) -> AdState:
    """Transcribe voice audio to text using Malaysia-AI Whisper (direct call)."""
    _set_step(state, "transcribing")

    if not state.get("voice_audio_path"):
        state["transcript"] = "No voice description provided."
        return state

    try:
        from app.services.asr_engine import transcribe_audio

        with open(state["voice_audio_path"], "rb") as f:
            audio_bytes = f.read()

        filename = state["voice_audio_path"].split("/")[-1].split("\\")[-1]
        transcript = await transcribe_audio(
            audio_bytes,
            filename=filename,
            language=state.get("language", "en"),
        )
        state["transcript"] = transcript if transcript else "Transcription returned empty."
    except Exception as e:
        state["transcript"] = "Transcription unavailable."
        logger.error(f"[Agent1] Whisper error: {e}")
    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 2: Product Vision Analysis (Kimi-K2.5)
# ═══════════════════════════════════════════════════════════════

async def vision_analysis_agent(state: AdState) -> AdState:
    """Analyze product image using Kimi-K2.5 vision via OpenRouter."""
    _set_step(state, "analyzing")

    try:
        import httpx
        api_key = os.getenv("OPENROUTER_API_KEY", "")

        with open(state["product_image_path"], "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()

        prompt = (
            "Analyze this product image and extract:\n"
            "1. product_type: What kind of product is this?\n"
            "2. product_name: Best guess at the product name (from packaging text)\n"
            "3. category: Food/Handicraft/Textile/Other\n"
            "4. colors: Dominant colors\n"
            "5. features: 3 key visual features\n"
            "6. mood: What mood/feeling does this product evoke?\n"
            "7. target_audience: Who would buy this?\n"
            "8. texture_details: Describe the textures visible (matte, glossy, rough, etc.)\n"
            "9. setting_suggestion: What real-world setting would showcase this product best?\n"
            "Return as JSON."
        )

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "qwen/qwen-2.5-vl-72b-instruct",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
                        ],
                    }],
                    "max_tokens": 6000,
                },
            )
            data = resp.json()

            # Guard against error responses
            if "choices" not in data:
                error_msg = data.get("error", {}).get("message", str(data))
                raise ValueError(f"OpenRouter error: {error_msg}")

            text = data["choices"][0]["message"]["content"]
            # Parse JSON from response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            state["product_analysis"] = json.loads(text.strip())

    except Exception as e:
        state["product_analysis"] = {
            "product_type": "Unknown product",
            "product_name": "Product",
            "category": "Other",
            "colors": ["Unknown"],
            "features": ["product"],
            "mood": "neutral",
            "target_audience": "general consumers",
            "texture_details": "unspecified",
            "setting_suggestion": "studio",
        }
        logger.error(f"[Agent2] Vision analysis error: {e}")
    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 3: Director Script Writer (Qwen 2.5-72B) ★ ELITE DIRECTORS TREATMENT
# ═══════════════════════════════════════════════════════════════

async def script_writer_agent(state: AdState) -> AdState:
    """
    Generate a rich, sensory 150-250 word cinematic prompt + 2 extracted subtitle phrases.

    Output:
      - director_script: single cinematic narrative string
      - subtitle_data: [subtitle_1, subtitle_2] as raw strings
      - caption: social media caption
      - hashtags: list of hashtag strings
      - script: combined subtitle text
    """
    _set_step(state, "scripting")

    try:
        import httpx
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        analysis = state.get("product_analysis", {})
        transcript = state.get("transcript", "")

        prompt = f"""You are an elite, award-winning commercial film director creating a sensory-rich storyboard for an ASEAN MSME product.
Product: {analysis.get('product_name', analysis.get('product_type', 'product'))}
Category: {analysis.get('category', 'General')}
Visual Features: {', '.join(analysis.get('features', ['product']))}
Mood/Feel: {analysis.get('mood', 'warm')}
Texture: {analysis.get('texture_details', 'unspecified')}
Setting: {analysis.get('setting_suggestion', 'studio')}
Target Audience: {analysis.get('target_audience', 'consumers')}
Seller's Description: {transcript}
Platform: {state.get('platform', 'tiktok')} (vertical 9:16)
Language: {'Bahasa Malaysia' if state.get('language') == 'ms' else 'English' if state.get('language') == 'en' else 'Chinese'}

INSTRUCTIONS:
1. Write a rich, flowing, cinematic narrative paragraph (approx. 150-250 words) describing the commercial from start to finish. 
2. Narrative Arc: Start with an extreme close-up or macro shot of the raw product/packaging, seamlessly transition (dissolve/cut) into a montage of preparation or usage, and end on a stunning "still life" beauty shot.
3. Cinematography & Lighting: Strictly use professional camera terminology (e.g., extreme macro shot, tracking, rack focus, backlit, slow motion). Explicitly describe the lighting (e.g., warm amber glow, shaft of light, studio rim light).
4. Sensory Language: Describe textures (matte, glistening, fluffy) and implied sound design (e.g., satisfying crrr-rip, low hum, gentle patter) to build mood.
5. The Subtitles/Voiceover: Conclude the paragraph EXACTLY with this formatting: "..., accompanied by a warm, reassuring voiceover: '[Insert 3-5 word thematic phrase 1]. [Insert 3-5 word thematic phrase 2].'"

IMPORTANT — CAPTION:
Generate a catchy social media caption based on the seller's voice description.
The caption must be in {'Bahasa Malaysia' if state.get('language') == 'ms' else 'English' if state.get('language') == 'en' else 'Chinese'}.
Your caption must follow the AIDA copywriting formula:
1. Attention: Grab the reader's attention with a catchy headline.
2. Interest: Build interest by highlighting benefits.
3. Desire: Create a desire by showcasing emotional appeal.
4. Action: Encourage the reader to take action.

Return ONLY valid JSON:
{{
    "cinematic_script": "Bathed in the warm, amber glow of a late afternoon sun, the camera opens with an extreme macro shot...",
    "subtitle_1": "Extracted phrase 1 from the end of the script",
    "subtitle_2": "Extracted phrase 2 from the end of the script",
    "caption": "Catchy social media caption with AIDA formula",
    "hashtags":["#tag1", "#tag2", "#tag3"]
}}"""

        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "qwen/qwen-2.5-72b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 1000,
                },
            )
            data = resp.json()

            # Guard against error responses
            if "choices" not in data:
                error_msg = data.get("error", {}).get("message", str(data))
                raise ValueError(f"OpenRouter error: {error_msg}")

            text = data["choices"][0]["message"]["content"]
            result = json.loads(text.strip())

            # Map the new rich paragraph to the director_script state
            state["director_script"] = result.get("cinematic_script", "Professional product showcase, warm studio lighting, slow rotation")

            # Store raw subtitle strings for Agent 6 to time
            state["subtitle_data"] =[
                result.get("subtitle_1", "Premium Quality."),
                result.get("subtitle_2", "Order Now."),
            ]

            state["caption"] = result.get("caption", "")
            state["hashtags"] = result.get("hashtags", [])

            # Build script from subtitles
            state["script"] = f"{result.get('subtitle_1', '')} {result.get('subtitle_2', '')}".strip()

            # Backward compat: populate storyboard (single scene)
            state["storyboard"] =[{
                "timestamp": "0-8s",
                "narration": state["script"],
                "visual_direction": state["director_script"],
            }]

    except Exception as e:
        state["director_script"] = "Professional product showcase, warm studio lighting, product centered in frame, slow 360 rotation, premium atmosphere"
        state["subtitle_data"] = ["Premium Quality.", "Order Now."]
        state["script"] = "Premium Quality. Order Now."
        state["caption"] = "#MSMEProduct #ShopLocal"
        state["hashtags"] = ["#MSMEProduct", "#ShopLocal"]
        state["storyboard"] =[{"timestamp": "0-8s", "narration": "Premium Quality. Order Now.", "visual_direction": "Product showcase"}]
        logger.error(f"[Agent3] Director script error: {e}")
        
    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 4: Background Removal (rembg) — isolate product
# ═══════════════════════════════════════════════════════════════

async def background_removal_agent(state: AdState) -> AdState:
    """Remove background from product image using rembg/U²-Net."""
    _set_step(state, "removing_bg")

    try:
        from rembg import remove

        with open(state["product_image_path"], "rb") as f:
            input_data = f.read()

        output_data = remove(input_data)

        # Save isolated product
        output_path = state["product_image_path"].rsplit(".", 1)[0] + "_isolated.png"
        with open(output_path, "wb") as f:
            f.write(output_data)

        state["isolated_product_path"] = output_path
    except Exception as e:
        state["isolated_product_path"] = state["product_image_path"]
        logger.error(f"[Agent4] Background removal error: {e}")
    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 5: LTX-2.3 Video Generation ★ SINGLE CALL
# ═══════════════════════════════════════════════════════════════

async def ltx_video_agent(state: AdState) -> AdState:
    """
    Generate ONE video clip using LTX-2.3 via the private HF Space.
    Makes a single API call with the cinematic prompt from Agent 3.

    Input: isolated product image + single cinematic prompt
    Output: one 8-second MP4 clip
    """
    _set_step(state, "generating_video")

    hf_token = os.getenv("HF_TOKEN", "")
    if not hf_token:
        state["error"] = "HF_TOKEN not set — cannot call LTX-2.3 Space."
        state["status"] = "failed"
        return state

    cinematic_prompt = state.get("director_script")
    if not cinematic_prompt:
        state["error"] = "No cinematic prompt to generate video from."
        state["status"] = "failed"
        return state

    # Use isolated product image (from rembg) as the source
    img_path = state.get("isolated_product_path") or state["product_image_path"]

    output_dir = Path("temp_videos") / f"clips_{state['clerk_id'][:8]}_{int(time.time())}"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        from gradio_client import Client, handle_file

        # Connect to private Space
        client = Client(
            "nathanyap17/snapsell-ltx2.3",
            token=hf_token,
        )

        logger.info(f"[Agent5] Generating single clip: {str(cinematic_prompt)[:80]}...")

        # ★ SINGLE HF CALL — no loop
        result = await asyncio.to_thread(
            client.predict,
            image_uri=handle_file(img_path),
            prompt=str(cinematic_prompt),
            duration=8,
            width=576,
            height=1024,     # 9:16 vertical (max 1024)
            fps=24,
            seed=42,
            randomize_seed=True,
            api_name="/generate_video",
        )

        # Gradio may return a tuple (video_filepath, used_seed)
        video_path = result[0] if isinstance(result, tuple) else result

        # Sometimes Gradio returns a dict for FileData: {"path": "...", "url": "..."}
        if isinstance(video_path, dict) and "path" in video_path:
            video_path = video_path["path"]

        if video_path and Path(str(video_path)).exists():
            clip_dest = str(output_dir / "scene_01.mp4")
            import shutil
            shutil.copy2(str(video_path), clip_dest)
            state["video_clips"] = [clip_dest]
            logger.info(f"[Agent5] ✅ Single clip saved: {clip_dest}")
        else:
            state["error"] = f"LTX-2.3 returned no file or invalid path: {result}"
            state["status"] = "failed"
            logger.warning(f"[Agent5] No valid clip returned: {result}")

    except Exception as e:
        state["error"] = f"LTX-2.3 connection failed: {str(e)}"
        state["status"] = "failed"
        logger.error(f"[Agent5] LTX video gen error: {e}", exc_info=True)

    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 6: Subtitle Generator ★ HARDCODED TIMING
# ═══════════════════════════════════════════════════════════════

async def subtitle_generator_agent(state: AdState) -> AdState:
    """
    Apply strict mathematical timing to the 2 subtitle phrases from Agent 3.
    Sub 1: 0.5s to 3.5s (3 seconds duration)
    Sub 2: 4.5s to 7.5s (3 seconds duration)
    """
    _set_step(state, "subtitling")

    try:
        raw_subs = state.get("subtitle_data", ["Premium Quality.", "Order Now."])

        # If subtitle_data is already formatted (list of dicts), skip
        if raw_subs and isinstance(raw_subs[0], dict):
            return state

        # Ensure we have exactly 2 subtitles
        if not raw_subs or len(raw_subs) < 2:
            raw_subs = ["Premium Quality.", "Order Now."]

        # Mathematically space the two subtitles over the 8-second video
        formatted_subs = [
            {"text": str(raw_subs[0]), "start": 0.5, "end": 3.5},
            {"text": str(raw_subs[1]), "start": 4.5, "end": 7.5},
        ]

        state["subtitle_data"] = formatted_subs
    except Exception as e:
        state["subtitle_data"] = []
        logger.error(f"[Agent6] Subtitle error: {e}")
    return state


# ═══════════════════════════════════════════════════════════════
#  Agent 7: Video Assembler (MoviePy) ★ SINGLE CLIP
# ═══════════════════════════════════════════════════════════════

async def video_assembler_agent(state: AdState) -> AdState:
    """
    Assemble final video:
    - Load single LTX-generated clip
    - Overlay timed subtitles (2 phrases)
    - Output final 1080x1920 MP4
    """
    _set_step(state, "assembling")

    clips = state.get("video_clips", [])
    if not clips:
        # Fallback: if LTX failed, create a simple static video from the product image
        logger.warning("[Agent7] No video clips — falling back to static image video")
        try:
            await _fallback_static_video(state)
        except Exception as e:
            state["status"] = "failed"
            state["error"] = f"Fallback assembly failed: {str(e)}"
            logger.error(f"[Agent7] Fallback error: {e}", exc_info=True)
        return state

    try:
        from moviepy import (
            VideoFileClip,
            TextClip,
            CompositeVideoClip,
        )

        W, H = 1080, 1920

        # Load the single clip
        base_clip = VideoFileClip(clips[0]).resized((W, H))

        # Overlay subtitles
        subtitle_clips = []
        subtitles = state.get("subtitle_data", [])
        for sub in subtitles:
            try:
                txt = (
                    TextClip(
                        text=sub["text"],
                        font_size=36,
                        color="white",
                        font="Arial-Bold",
                        stroke_color="black",
                        stroke_width=2,
                        size=(W - 120, None),
                        method="caption",
                    )
                    .with_position(("center", H - 280))
                    .with_start(sub["start"])
                    .with_duration(sub["end"] - sub["start"])
                )
                subtitle_clips.append(txt)
            except Exception:
                pass

        if subtitle_clips:
            final = CompositeVideoClip([base_clip] + subtitle_clips, size=(W, H))
        else:
            final = base_clip

        # Write final video
        output_dir = Path("temp_videos")
        output_dir.mkdir(exist_ok=True)
        output_path = str(output_dir / f"ad_{state['clerk_id'][:8]}_{int(time.time())}.mp4")

        final.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio=True,   # Preserve audio from LTX clip if any
            logger=None,
        )

        # Cleanup
        base_clip.close()

        state["video_path"] = output_path
        state["status"] = "complete"

    except Exception as e:
        state["status"] = "failed"
        state["error"] = str(e)
        logger.error(f"[Agent7] Video assembly error: {e}", exc_info=True)

    return state


async def _fallback_static_video(state: AdState):
    """Fallback: create video from static product image if LTX fails."""
    from moviepy import ImageClip, TextClip, CompositeVideoClip, ColorClip

    W, H = 1080, 1920
    duration = 8  # Match the single-clip 8s duration

    img_path = state.get("isolated_product_path") or state["product_image_path"]
    bg = ColorClip(size=(W, H), color=(10, 15, 26)).with_duration(duration)
    product = (
        ImageClip(img_path)
        .resized(width=W - 100)
        .with_position("center")
        .with_duration(duration)
    )

    clips = [bg, product]

    subtitles = state.get("subtitle_data", [])
    for sub in subtitles:
        try:
            txt = (
                TextClip(
                    text=sub["text"],
                    font_size=40,
                    color="white",
                    font="Arial-Bold",
                    stroke_color="black",
                    stroke_width=2,
                    size=(W - 120, None),
                    method="caption",
                )
                .with_position(("center", H - 280))
                .with_start(sub["start"])
                .with_duration(sub["end"] - sub["start"])
            )
            clips.append(txt)
        except Exception:
            pass

    output_dir = Path("temp_videos")
    output_dir.mkdir(exist_ok=True)
    output_path = str(output_dir / f"ad_{state['clerk_id'][:8]}_{int(time.time())}_fallback.mp4")

    video = CompositeVideoClip(clips, size=(W, H)).with_duration(duration)
    video.write_videofile(output_path, fps=24, codec="libx264", audio=False, logger=None)

    state["video_path"] = output_path
    state["status"] = "complete"
