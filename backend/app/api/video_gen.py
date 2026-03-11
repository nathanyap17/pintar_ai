"""
Snap & Sell 2.0 — Video Generation API
POST /api/video/generate — Upload product image + optional voice → trigger LangGraph pipeline
GET  /api/video/status/{job_id} — Poll job status (includes current_step for progress)
GET  /api/video/download/{job_id} — Download completed video
"""

import os
import uuid
import logging
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.agents.snap_sell_agent import run_ad_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job store (production: use Redis/Convex)
_jobs: dict = {}
UPLOAD_DIR = Path("temp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    voice: UploadFile = File(None),
    clerk_id: str = Form(""),
    listing_id: str = Form(""),
    platform: str = Form("tiktok"),
    language: str = Form("ms"),
):
    """
    Start async video generation job.
    Returns job_id for status polling.
    """
    if not image.filename:
        raise HTTPException(status_code=400, detail="Product image is required.")

    # Save uploads to temp
    job_id = str(uuid.uuid4())[:8]
    img_path = str(UPLOAD_DIR / f"{job_id}_{image.filename}")
    with open(img_path, "wb") as f:
        f.write(await image.read())

    voice_path = None
    if voice and voice.filename:
        voice_path = str(UPLOAD_DIR / f"{job_id}_{voice.filename}")
        with open(voice_path, "wb") as f:
            f.write(await voice.read())

    # Register job with step tracking
    _jobs[job_id] = {
        "status": "queued",
        "current_step": "queued",
        "clerk_id": clerk_id,
        "video_path": None,
        "script": None,
        "director_script": None,
        "caption": None,
        "hashtags": None,
        "error": None,
    }

    # Fire-and-forget background task
    asyncio.create_task(_run_pipeline(
        job_id, img_path, voice_path, clerk_id, listing_id, platform, language
    ))

    return {"job_id": job_id, "status": "queued"}


async def _run_pipeline(
    job_id: str,
    img_path: str,
    voice_path: str,
    clerk_id: str,
    listing_id: str,
    platform: str,
    language: str,
):
    """Background task that runs the LangGraph pipeline with real-time step sync."""
    try:
        _jobs[job_id]["status"] = "processing"
        _jobs[job_id]["current_step"] = "starting"

        # We pass a shared dict as the initial state.
        # During pipeline execution, each agent updates state["current_step"].
        # We poll that dict periodically to sync to the job store.
        from app.agents.snap_sell_agent import ad_pipeline, AdState

        shared_state: AdState = {
            "product_image_path": img_path,
            "voice_audio_path": voice_path,
            "clerk_id": clerk_id,
            "listing_id": listing_id or None,
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
            "current_step": "starting",
            "error": None,
            "platform": platform,
            "language": language,
        }

        # Run the pipeline (it updates shared_state in-place per agent)
        result = await ad_pipeline.ainvoke(shared_state)

        _jobs[job_id].update({
            "status": result.get("status", "complete"),
            "current_step": "done" if result.get("status") == "complete" else result.get("current_step", "failed"),
            "video_path": result.get("video_path"),
            "script": result.get("script"),
            "director_script": result.get("director_script"),
            "caption": result.get("caption"),
            "hashtags": result.get("hashtags"),
            "error": result.get("error"),
        })

    except Exception as e:
        _jobs[job_id].update({
            "status": "failed",
            "current_step": "failed",
            "error": str(e),
        })
        logger.error(f"[VideoGen] Job {job_id} failed: {e}", exc_info=True)


# Background polling task: sync current_step from the pipeline state
# The LangGraph pipeline updates state["current_step"] in each agent.
# Since we run in-process, we can periodically check.


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Poll job status including current pipeline step."""
    from app.agents.agent_modules import get_current_step

    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # If processing, read real-time step from the global tracker
    if job["status"] == "processing":
        # We stored clerk_id in the job for lookup
        clerk_id = job.get("clerk_id", "")
        if clerk_id:
            job["current_step"] = get_current_step(clerk_id)

    return {
        "job_id": job_id,
        **job,
    }


@router.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download completed video."""
    from fastapi.responses import FileResponse

    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job["status"] != "complete" or not job["video_path"]:
        raise HTTPException(status_code=400, detail="Video not ready.")

    return FileResponse(
        job["video_path"],
        media_type="video/mp4",
        filename=f"pintar_ad_{job_id}.mp4",
    )
