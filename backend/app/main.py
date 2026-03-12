"""
PINTAR.ai — FastAPI Backend Application
Platform for Inclusive Trade & AI Resilience
"""

# CRITICAL: Load .env BEFORE any app imports so env vars are available at module level
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ledger, listing, compliance, whatsapp, predictive, ingestion, bank_analyzer, video_gen

app = FastAPI(
    title="PINTAR.ai API",
    description="Platform for Inclusive Trade & AI Resilience — Backend API for Sarawak MSME empowerment",
    version="2.0.0",
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(ledger.router, prefix="/api/ledger", tags=["Shadow Ledger"])
app.include_router(listing.router, prefix="/api/listing", tags=["Listing Generator"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["Compliance Sentinel"])
app.include_router(whatsapp.router, prefix="/api/webhook", tags=["WhatsApp Webhook"])
app.include_router(predictive.router, prefix="/api/predictive", tags=["Predictive Analytics"])
app.include_router(ingestion.router, prefix="/api/internal", tags=["Native Ingestion"])
app.include_router(bank_analyzer.router, prefix="/api/bank", tags=["Bank Analyzer"])
app.include_router(video_gen.router, prefix="/api/video", tags=["Video Generation"])


@app.get("/")
async def root():
    return {
        "service": "PINTAR.ai API",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "ledger": "/api/ledger/analyze",
            "listing": "/api/listing/generate",
            "compliance": "/api/compliance/query",
            "whatsapp_webhook": "/api/webhook/whatsapp",
            "whatsapp_test": "/api/webhook/whatsapp/test",
            "predictive": "/api/predictive/insights",
            "native_ingest": "/api/internal/ingest-native",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
