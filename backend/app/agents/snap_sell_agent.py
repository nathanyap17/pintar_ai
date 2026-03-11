"""
Snap & Sell 2.0 — LangGraph Orchestrator
Composes 7 agents into a sequential pipeline using LangGraph StateGraph.

Pipeline: Transcription → Vision Analysis → Director Script (single prompt) →
          Background Removal → LTX Video Gen (single call) → Subtitle Generator → Video Assembler
"""

import logging
from langgraph.graph import StateGraph, END

from app.agents.agent_modules import (
    AdState,
    transcription_agent,
    vision_analysis_agent,
    script_writer_agent,
    background_removal_agent,
    ltx_video_agent,
    subtitle_generator_agent,
    video_assembler_agent,
)

logger = logging.getLogger(__name__)


def should_continue(state: AdState) -> str:
    """Decide whether to continue the pipeline or abort."""
    if state.get("error"):
        return "end"
    return "continue"


def build_ad_pipeline() -> StateGraph:
    """
    Build the LangGraph StateGraph for ad video production.

    Flow:
    transcribe → vision → script → bg_remove → ltx_gen → subtitles → assemble → END
    """
    workflow = StateGraph(AdState)

    # Add nodes (each is an async agent function)
    workflow.add_node("transcribe", transcription_agent)
    workflow.add_node("vision", vision_analysis_agent)
    workflow.add_node("script", script_writer_agent)
    workflow.add_node("bg_remove", background_removal_agent)
    workflow.add_node("ltx_gen", ltx_video_agent)
    workflow.add_node("subtitles", subtitle_generator_agent)
    workflow.add_node("assemble", video_assembler_agent)

    # Add edges (sequential pipeline)
    workflow.set_entry_point("transcribe")
    workflow.add_edge("transcribe", "vision")
    workflow.add_edge("vision", "script")
    workflow.add_edge("script", "bg_remove")
    workflow.add_edge("bg_remove", "ltx_gen")
    workflow.add_edge("ltx_gen", "subtitles")
    workflow.add_edge("subtitles", "assemble")
    workflow.add_edge("assemble", END)

    return workflow.compile()


# Compile the pipeline once on import
ad_pipeline = build_ad_pipeline()


async def run_ad_pipeline(
    product_image_path: str,
    clerk_id: str,
    voice_audio_path: str = None,
    listing_id: str = None,
    platform: str = "tiktok",
    language: str = "ms",
    on_step_update=None,
) -> AdState:
    """
    Run the full Snap & Sell 2.0 video production pipeline.

    Args:
        product_image_path: Path to product photo
        clerk_id: User's Clerk ID
        voice_audio_path: Optional voice description audio
        listing_id: Optional linked product listing ID
        platform: Target platform (tiktok/instagram/whatsapp)
        language: Content language (ms/en/zh)
        on_step_update: Optional callback(step_name) for progress tracking

    Returns:
        Final AdState with video_path, script, caption, etc.
    """
    initial_state: AdState = {
        "product_image_path": product_image_path,
        "voice_audio_path": voice_audio_path,
        "clerk_id": clerk_id,
        "listing_id": listing_id,
        "transcript": None,
        "product_analysis": None,
        "script": None,
        "director_script": None,
        "caption": None,
        "hashtags": None,
        "storyboard": None,
        "isolated_product_path": None,
        "video_clips": None,
        "subtitle_data": None,
        "video_path": None,
        "status": "processing",
        "current_step": "queued",
        "error": None,
        "platform": platform,
        "language": language,
    }

    logger.info(
        f"[Snap&Sell] Starting 7-agent pipeline for clerk={clerk_id[:12]}... "
        f"platform={platform}, language={language}"
    )

    try:
        result = await ad_pipeline.ainvoke(initial_state)
        logger.info(
            f"[Snap&Sell] ✅ Pipeline complete — "
            f"status={result['status']}, video={result.get('video_path', 'N/A')}"
        )
        return result
    except Exception as e:
        logger.error(f"[Snap&Sell] Pipeline failed: {e}", exc_info=True)
        initial_state["status"] = "failed"
        initial_state["error"] = str(e)
        return initial_state
