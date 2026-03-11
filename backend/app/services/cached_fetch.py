"""
Resilient Cached Fetch — Stale-on-Error Caching Layer

Provides:
- In-memory TTL cache for external API responses
- In-flight request deduplication (prevents API stampedes)
- Stale-on-error fallback (returns last known good data on failure)

Usage:
    data = await cached_fetch("wto_sg", fetch_wto_data, ttl=300)
"""

import asyncio
import time
import logging
from typing import Any, Callable, Awaitable, Optional

logger = logging.getLogger(__name__)

# ─── In-memory stores ────────────────────────────────────────
_cache: dict[str, dict[str, Any]] = {}       # key → {data, timestamp}
_inflight: dict[str, asyncio.Task] = {}       # key → running Task


async def cached_fetch(
    key: str,
    fetch_fn: Callable[[], Awaitable[Any]],
    ttl: int = 300,
) -> Optional[Any]:
    """
    Fetch data with stale-on-error caching and in-flight deduplication.

    Args:
        key: Unique cache key (e.g., "wto_Singapore")
        fetch_fn: Async callable that returns the data
        ttl: Time-to-live in seconds (default 5 min)

    Returns:
        Fresh data if available, stale data on error, None if no data exists
    """
    now = time.time()

    # 1. Return fresh cache if within TTL
    if key in _cache:
        entry = _cache[key]
        age = now - entry["timestamp"]
        if age < ttl:
            logger.debug(f"[Cache] HIT (fresh) key={key} age={age:.0f}s")
            return entry["data"]

    # 2. Deduplicate in-flight requests
    if key in _inflight:
        logger.debug(f"[Cache] DEDUP — joining in-flight request for key={key}")
        try:
            return await _inflight[key]
        except Exception:
            # If the joined task also failed, fall through to stale
            pass

    # 3. Fetch fresh data
    async def _do_fetch():
        try:
            data = await fetch_fn()
            _cache[key] = {"data": data, "timestamp": time.time()}
            logger.info(f"[Cache] REFRESHED key={key}")
            return data
        except Exception as e:
            logger.warning(f"[Cache] FETCH FAILED key={key}: {e}")
            # Return stale data if available
            if key in _cache:
                logger.info(f"[Cache] STALE FALLBACK key={key}")
                return _cache[key]["data"]
            raise
        finally:
            _inflight.pop(key, None)

    task = asyncio.create_task(_do_fetch())
    _inflight[key] = task

    try:
        return await task
    except Exception:
        # Last resort: stale data
        if key in _cache:
            return _cache[key]["data"]
        return None


def cache_clear(key: Optional[str] = None):
    """Clear cache for a specific key or all keys."""
    if key:
        _cache.pop(key, None)
    else:
        _cache.clear()
