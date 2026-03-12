"""
RAG Engine — Vector Search Service
Uses SentenceTransformer for embeddings + Convex vector search.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-loaded model
_embedding_model = None
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"  # 384 dimensions
CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")


def _get_embedding_model():
    """Load SentenceTransformer model (lazy, cached)."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info(f"Loaded embedding model: {EMBEDDING_MODEL_NAME}")
    return _embedding_model


def embed_text(text: str) -> list[float]:
    """Generate embedding vector for input text."""
    model = _get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts (batched)."""
    model = _get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [e.tolist() for e in embeddings]


async def search_similar_documents(
    query: str,
    limit: int = 5,
    category: Optional[str] = None,
) -> list[dict]:
    """
    Search for similar DEFA documents using Convex vector search.

    For hackathon demo: if Convex is not configured, returns empty results
    gracefully so the LLM can still generate guidance from its training data.
    """
    from starlette.concurrency import run_in_threadpool

    try:
        # Run CPU-heavy synchronous embedding model in a background thread
        query_embedding = await run_in_threadpool(embed_text, query)
    except Exception as e:
        logger.error(f"Embedding model failed: {e}")
        return []

    if not CONVEX_URL:
        logger.warning("CONVEX_URL not configured — skipping vector search")
        return []

    try:
        from convex import ConvexClient

        client = ConvexClient(CONVEX_URL)

        args = {
                "embedding": query_embedding,
                "limit": limit,
            }
        # Only include category if it has a value (Convex rejects null for v.string())
        if category:
            args["category"] = category

        results = client.action(
            "compliance:searchSimilar",
            args,
        )

        return results or []

    except Exception as e:
        logger.error(f"Convex vector search failed: {e}")
        return []


def format_context(documents: list[dict], max_chars: int = 6000) -> str:
    """Format retrieved documents into a context string for the LLM."""
    if not documents:
        return "(No reference documents found — provide general ASEAN guidance)"

    context_parts = []
    total_chars = 0

    for i, doc in enumerate(documents, 1):
        title = doc.get("title", "Untitled")
        content = doc.get("content", "")
        source = doc.get("source", "Unknown")
        score = doc.get("score", 0)

        entry = f"[Doc {i}] {title} (source: {source}, relevance: {score:.2f})\n{content}"

        if total_chars + len(entry) > max_chars:
            remaining = max_chars - total_chars
            if remaining > 100:
                context_parts.append(entry[:remaining] + "...")
            break

        context_parts.append(entry)
        total_chars += len(entry)

    return "\n\n---\n\n".join(context_parts)
