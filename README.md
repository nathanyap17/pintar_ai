# PINTAR.ai — Platform for Inclusive Trade & AI Resilience

> 🌏 AI-powered platform empowering ASEAN MSMEs in Sarawak/Borneo to digitize informal trade, reach global markets, and navigate cross-border compliance.

---

## 1. General Description

### What PINTAR.ai Does

PINTAR.ai is an **end-to-end AI platform** built to solve the financial invisibility faced by Micro, Small, and Medium Enterprises (MSMEs) in the ASEAN region — especially in underserved areas like **Sarawak, Malaysian Borneo**.

Most MSMEs in Borneo trade informally: handwritten receipts, cash transactions via WhatsApp, and no formal bookkeeping. This makes them **invisible to banks** and unable to access financing, export markets, or digital marketing tools.

PINTAR.ai uses **AI agents** to automate what MSMEs cannot do themselves:

| # | Feature | What It Does |
|---|---------|--------------|
| 1 | **Shadow Ledger** | Converts receipt photos and WhatsApp messages into structured financial records using OCR + AI classification |
| 2 | **Bankability Dashboard** | Analyzes bank statements with AI vision (Qwen 3 VL) to produce a **Proxy Credit Score (300–850)**, 6 core financial health metrics, and a loan eligibility pre-screening verdict |
| 3 | **Compliance Sentinel** | Interactive ASEAN map that fuses 5 data streams (financial data, regulatory rules, WTO barriers, logistics, and **live web search**) into an export compliance intelligence brief |
| 4 | **VernStudio (Snap & Sell 2.0)** | Product photo + voice description → AI generates an **8-second vertical video ad** with subtitles, captions, and hashtags, ready for TikTok/Reels/WhatsApp Status |
| 5 | **WhatsApp Automation** | Links MSME's WhatsApp → silently intercepts customer transactions → auto-classifies and records to Shadow Ledger with zero effort |
| 6 | **Predictive Analytics** | Combines deterministic financial math with LLM reasoning to produce revenue forecasts and strategic directives |

### SDG Addressed

PINTAR.ai directly addresses **3 United Nations Sustainable Development Goals**:

| SDG | Goal | How PINTAR.ai Contributes |
|-----|------|--------------------------|
| **SDG 8** | Decent Work & Economic Growth | Empowers informal MSMEs to formalize their trade records, access financing, and grow their businesses through AI-driven tools |
| **SDG 9** | Industry, Innovation & Infrastructure | Builds inclusive digital infrastructure for underserved MSMEs using open-source AI models (LTX-2.3, Whisper, Qwen) and multi-agent pipelines |
| **SDG 10** | Reduced Inequalities | Bridges the digital divide between urban and rural traders in Borneo by providing enterprise-grade tools (credit scoring, compliance, video marketing) at zero cost |

### Target Users

| User Segment | Profile | Primary Use Case |
|-------------|---------|-----------------|
| **Sarawak MSMEs** | Rural traders, farmers, cottage industry producers (Beras Bario, pepper, Pua Kumbu textiles) | Digitize sales records, generate credit scores, create social media ads |
| **ASEAN Cross-Border Traders** | MSMEs exporting to Singapore, Brunei, Thailand, Indonesia | Navigate SPS/TBT regulations, get compliance intelligence briefs |
| **Financial Institutions** | Banks, microfinance lenders evaluating MSME loan applications | Review AI-generated Proxy Credit Scores and bankability profiles |
| **Development Agencies** | MATRADE, SDEC, NGOs supporting MSME digitalization in Borneo | Monitor MSME formalization progress at scale |

---

## 2. Setup Instructions

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | Frontend (Next.js) + Convex |
| **Python** | 3.11–3.13 | Backend (FastAPI + AI models) |
| **Tesseract OCR** | Latest | Receipt text extraction |
| **Convex Account** | Free tier | Real-time database ([convex.dev](https://convex.dev)) |
| **Clerk Account** | Free tier | Authentication ([clerk.com](https://clerk.com)) |
| **OpenRouter API Key** | — | Powers Qwen 2.5, Kimi-K2.5 vision models ([openrouter.ai](https://openrouter.ai)) |
| **SerpAPI Key** | — | Live web search for compliance grounding ([serpapi.com](https://serpapi.com)) |
| **HuggingFace Token** | — | Access private LTX-2.3 video generation Space |

> **Note (Python 3.14):** If you're on Python 3.14, do NOT use a venv — `pydantic-core` doesn't have pre-built wheels yet. Install packages globally. For Python 3.12/3.13, a standard venv works fine.

### How to Install

```bash
# 1. Clone the repository
git clone <repo> && cd pintar_ai

# 2. Install Frontend dependencies
cd frontend && npm install

# 3. Install Backend dependencies
cd ../backend && pip install -r requirements.txt

# 4. (Optional) Install WhatsApp Microservice
cd ../whatsapp-service && npm install
```

### Environment Configuration

Create a `.env` file in the **backend/** directory with the following keys:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# AI Models (OpenRouter)
OPENROUTER_API_KEY=sk-or-xxxxx

# Web Search Grounding
SERPAPI_API_KEY=xxxxx

# Video Generation (HuggingFace)
HF_TOKEN=hf_xxxxx

# (Optional) Twilio — WhatsApp demo
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NGROK_AUTHTOKEN=your-ngrok-token
```

Also create a `.env.local` file in the **frontend/** directory:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### How to Run

1. Open **4 terminal windows**:

```powershell
# Terminal 1: Backend (FastAPI)
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Ngrok for Twilio Webhook (Required for WhatsApp demo)
# Make sure you authenticated: `ngrok config add-authtoken $NGROK_AUTHTOKEN`
ngrok http 8000
# NOTE: Copy the Forwarding URL (e.g., https://1234-abcd.ngrok-free.app) 
# and paste it into the Twilio Sandbox "When a message comes in" webhook field + `/api/webhook/whatsapp`

# Terminal 3: Frontend (Next.js)
cd frontend
npm run dev

# Terminal 4: Convex (reactive database sync)
cd frontend
npx convex dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | `:3000` | Next.js dashboard + UI |
| Backend | `:8000` | FastAPI (AI processing + webhooks) |
| Ngrok   | `:8000` | Tunnels FastAPI to the internet for Twilio |
| Convex | — | Real-time database sync |

> **Tip:** Frontend and Backend both support hot-reload. Only restart if a process crashes or you install new dependencies.

---

## 3. How to Interact with Prototype — Judge's Guide

### Demo Credentials

```
Email:    demony11111@gmail.com
Password: DEMO@11111
```

### Page URLs

| Page | URL |
|------|-----|
| Landing Page | [http://localhost:3000](http://localhost:3000) |
| Command Center Dashboard | [http://localhost:3000/dashboard](http://localhost:3000/dashboard) |
| Shadow Ledger | [http://localhost:3000/shadow-ledger](http://localhost:3000/shadow-ledger) |
| Snap & Sell (VernStudio) | [http://localhost:3000/snap-sell](http://localhost:3000/snap-sell) |
| Customs Navigator | [http://localhost:3000/customs](http://localhost:3000/customs) |
| Backend Swagger Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

### Test Case 1: Onboarding + Bankability Dashboard

**Goal:** Complete the 3-step onboarding wizard and receive an AI-generated Proxy Credit Score.

**Steps:**
1. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Log in with the demo credentials above
3. The **Onboarding Modal** appears automatically
4. **Step 1 — Business Profile:**
   - Business Name: `Kedai Runcit Sarawak`
   - SSM Number: `SA0123456-X`
   - Business Type: Select `Food & Beverage`
   - Region: `Kuching`
   - Years Operating: Slide to `3`
   - Annual Turnover: `150000`
5. **Step 2 — Loan & Projections:**
   - Loan Purpose: `Working Capital`
   - Projected Revenue (12m): `180000`
   - Add an asset: Type `Property`, Description `Shop lot`, Value `250000`
6. **Step 3 — Financial Uploads:**
   - Upload a bank statement PDF (3–12 months)
   - Toggle the CCRIS/CTOS consent
   - Click **"Analyze with AI"**
7. **Expected Result:**
   - The dashboard transitions to **State B** with:
     - ✅ Pre-screening eligibility verdict (Eligible / Not Yet Eligible)
     - 📊 6 core financial metrics (Net Cash Flow, DSCR, Expense Ratio, Overdrafts, Revenue Consistency, Avg Monthly Balance)
     - 🎯 Proxy Credit Score (300–850) on an SVG speedometer
     - 💡 Improvement cards (dynamically generated from weaknesses)
     - 📈 Revenue Heatmap (GitHub-style 365-cell grid)

---

### Test Case 2: Shadow Ledger (Receipt Upload)

**Goal:** Upload a receipt photo and see it auto-classified into a structured financial record.

**Steps:**
1. Navigate to **Shadow Ledger** → [http://localhost:3000/shadow-ledger](http://localhost:3000/shadow-ledger)
2. Click **"Upload Receipt"** or use the camera
3. Upload a photo of any receipt (grocery, restaurant, etc.)
4. **Expected Result:**
   - The system runs **Tesseract OCR** to extract text
   - **DistilBERT** classifier identifies the transaction type (PAYMENT_IN / ORDER_IN / COMPLAINT)
   - **Qwen 2.5** extracts: item description, amount (RM), date, and sentiment
   - The entry appears as a new row in the Shadow Ledger table
   - The **Revenue Heatmap** on the Dashboard updates in real-time

---

### Test Case 3: VernStudio — AI Video Ad (Snap & Sell 2.0)

**Goal:** Generate a short video ad from a product photo and voice description.

**Steps:**
1. Navigate to **Snap & Sell** → [http://localhost:3000/snap-sell](http://localhost:3000/snap-sell)
2. **Upload a product photo** (any product image — phone camera quality works)
3. **Record a voice description** (hold the microphone button and describe the product in Malay or English, e.g., _"This is our premium Beras Bario from the highlands of Sarawak, 100% natural and non-GMO"_)
4. Click **"Generate Video Ad"**
5. Watch the **4-step agent progress tracker** animate:
   - 🖼️ Vision Agent → analyzing product
   - 🎤 Audio Agent → transcribing voice
   - ✍️ Copywriter Agent → generating subtitles and captions
   - 🎬 Director Agent → compositing video
6. **Expected Result:**
   - An 8-second vertical video ad plays in the preview panel
   - **Caption and hashtags** appear in the overlay container at the bottom of the video
   - A **Play/Pause** button overlays the video (click to toggle)
   - A **Download Video** button allows direct MP4 download
   - The sidebar panel shows "Ready to Publish" with share options (WhatsApp, TikTok, Reels)

> **Note:** The video generation via the LTX-2.3 HuggingFace Space may take 2–5 minutes depending on whether the Space needs to wake up. If it times out, the system falls back to a static image video with subtitles.

---

### Test Case 4: Compliance Sentinel (Geospatial Command Center)

**Goal:** Check export compliance for a Sarawak product to an ASEAN destination.

**Steps:**
1. Navigate to **Customs** → [http://localhost:3000/customs](http://localhost:3000/customs)
2. Select a product from the dropdown (e.g., `Beras Bario`)
3. **Click on a country** on the interactive ASEAN map (e.g., Singapore)
4. **Expected Result:**
   - The **Intelligence Drawer** slides in from the right with:
     - 🌍 **Live Web-Grounded Analysis** badge (when SerpAPI sources are found)
     - **Friction Score** (0–100) with a color-coded gauge (green/yellow/red)
     - **Barrier Alerts** — SPS/TBT requirements with severity and mitigation steps
     - **Logistics Trends** — freight index, transit days, cost per kg
     - **Financial Feasibility** — based on Shadow Ledger data (can your cash flow absorb this export?)
     - **Strategic Verdict** — AI recommendation with specific numbers and next steps
     - **Grounding Source Chips** — clickable URLs from live web search results

---

### Test Case 5: WhatsApp Automation (Mock Endpoint)

**Goal:** Simulate an incoming WhatsApp customer message and see it auto-classified.

**Steps:**
1. Open a terminal or the Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs)
2. Send a POST request to the test endpoint:
   ```powershell
   curl -X POST http://localhost:8000/api/webhook/whatsapp/test `
     -H "Content-Type: application/json" `
     -d '{"clerk_id": "user_3Agh3U8LOuP1PUi5xqEx5kZ6Raa", "body": "Order masuk 10kg Beras Bario, payment RM300 received"}'
   ```
3. **Expected Result:**
   ```json
   {
     "status": "success",
     "classification": "PAYMENT_IN",
     "confidence": 0.7,
     "extracted_data": { "item": "Beras Bario", "amount_myr": 300 },
     "whatsapp_reply": "✅ Rekod disimpan: RM 300 untuk Beras Bario"
   }
   ```
4. Navigate to the **Shadow Ledger** page — the entry should appear in real-time

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript, Recharts, react-simple-maps, framer-motion |
| **Auth** | Clerk (Google OAuth + Magic Link) |
| **Database** | Convex (document store + real-time + vector search) |
| **Backend** | FastAPI (Python 3.11+) |
| **ASR** | Malaysia-AI Whisper-50TPS + Gemma3n Audio Encoder |
| **LLM (text)** | Qwen 2.5-72B via OpenRouter |
| **LLM (vision)** | Qwen 3 VL (PDF vision), Kimi-K2.5 (product photos) via OpenRouter |
| **Web Search** | SerpAPI (Google Search grounding for compliance) |
| **OCR** | Tesseract + Pillow |
| **Embeddings** | all-MiniLM-L6-v2 (384-dim, SentenceTransformers) |
| **Multi-Agent** | LangGraph + langchain-core (7-agent video production pipeline) |
| **Video Gen** | LTX-2.3 (HuggingFace Space + ZeroGPU) — image-to-video |
| **Video Post** | MoviePy + FFmpeg — subtitle overlay + 1080×1920 vertical MP4 |
| **Image** | rembg (U²-Net background removal), PyMuPDF (PDF→image) |

---

## 📁 Project Structure

```
pintar_ai/
├── frontend/                  # Next.js 15 + TypeScript
│   ├── convex/                # Convex schema + functions
│   │   ├── schema.ts          # Document schema (6 tables + vector index)
│   │   ├── ledgers.ts         # Shadow-ledger queries + heatmap
│   │   ├── listings.ts        # Product listing + file storage
│   │   ├── compliance.ts      # Vector search for RAG
│   │   ├── profiles.ts        # User profiles + onboarding + bank data
│   │   ├── export_queries.ts  # Compliance search logs
│   │   └── admin.ts           # User data reset mutation
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── dashboard/      # Command Center — eligibility verdict + 6 metrics
│       │   ├── shadow-ledger/  # Receipt upload + OCR analysis
│       │   ├── snap-sell/      # VernStudio — voice + photo → video ad
│       │   └── customs/        # Geospatial Compliance Command Center
│       └── components/
│           ├── AseanMap.tsx           # Clickable ASEAN SVG map
│           ├── IntelligenceDrawer.tsx # Fusion intel panel + web grounding
│           ├── OnboardingModal.tsx    # 3-step wizard
│           ├── VerdictBanner.tsx      # Pre-screening eligibility verdict
│           ├── MetricChart.tsx        # Gauge, Progress, Counter charts
│           ├── ImprovementCards.tsx   # Expandable action cards
│           ├── ProxyScoreGauge.tsx    # SVG speedometer (300–850)
│           ├── RevenueHeatmap.tsx     # GitHub-style annual revenue heatmap
│           └── ProfileSync.tsx       # Auto-creates Convex profile on login
├── backend/                   # FastAPI backend
│   └── app/
│       ├── main.py            # CORS + routers
│       ├── api/
│       │   ├── ledger.py      # POST /api/ledger/analyze
│       │   ├── listing.py     # POST /api/listing/generate
│       │   ├── compliance.py  # POST /api/compliance/analyze (data fusion + web grounding)
│       │   ├── bank_analyzer.py  # POST /api/bank/analyze (PDF → 6 metrics + Proxy Score)
│       │   ├── video_gen.py   # POST /api/video/generate (LangGraph pipeline)
│       │   ├── whatsapp.py    # POST /api/webhook/whatsapp (Twilio demo)
│       │   ├── ingestion.py   # POST /api/internal/ingest-native (Pipeline A)
│       │   └── predictive.py  # POST /api/predictive/insights
│       ├── agents/            # LangGraph multi-agent modules
│       │   ├── snap_sell_agent.py   # StateGraph orchestrator (7 agents)
│       │   └── agent_modules.py     # 7 agent functions
│       ├── data/
│       │   ├── asean_macro_context.json  # ASEAN economic data
│       │   ├── wto_barriers.json         # WTO SPS/TBT barriers
│       │   └── fred_logistics.json       # FRED shipping data
│       └── services/
│           ├── gemini_client.py  # Qwen 2.5-VL + SerpAPI search
│           ├── asr_engine.py    # Malaysia-AI Whisper ASR
│           ├── qwen_llm.py      # Qwen 2.5 + Kimi-K2.5 via OpenRouter
│           ├── ocr_engine.py    # Tesseract OCR
│           ├── rag_engine.py    # Embeddings + Convex vector search
│           └── cached_fetch.py  # Stale-on-error cache + deduplication
├── whatsapp-service/          # Node.js WhatsApp microservice
│   └── index.js               # Socket.io + whatsapp-web.js
├── notebooks/                 # ML training pipeline
│   ├── generate_dataset.py    # Synthetic dataset generator
│   ├── train_classifier.py    # DistilBERT fine-tuning script
│   └── evaluate_model.py      # Model evaluation + metrics
└── scripts/
    └── seed_defa_docs.py      # Seed DEFA compliance docs into Convex
```

---

## 🔗 All API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ledger/analyze` | Upload receipt image → structured ledger entry |
| POST | `/api/listing/generate` | Photo + voice → bilingual e-commerce listing |
| POST | `/api/compliance/query` | Product + route → compliance traffic-light (RAG) |
| POST | `/api/compliance/analyze` | Data fusion: Shadow Ledger + DEFA + WTO + FRED + SerpAPI → intelligence brief |
| POST | `/api/bank/analyze` | Bank PDF → Qwen 3 VL → 6 metrics + eligibility + Proxy Score |
| POST | `/api/video/generate` | Photo + voice → LangGraph 7-agent → LTX-2.3 → MP4 video ad |
| GET  | `/api/video/status/{job_id}` | Poll video generation job progress |
| GET  | `/api/video/download/{job_id}` | Download completed MP4 |
| POST | `/api/predictive/insights` | Neuro-symbolic predictive analytics |
| POST | `/api/webhook/whatsapp` | Twilio WhatsApp webhook (demo) |
| POST | `/api/webhook/whatsapp/test` | Mock WhatsApp test endpoint |
| POST | `/api/internal/ingest-native` | Native WhatsApp ingestion (Pipeline A) |
| GET  | `/health` | Backend health check |
| GET  | `/docs` | Swagger API documentation |

---

## 🤖 AI Models Used

| Model | Provider | Use Case |
|-------|----------|----------|
| **Qwen 2.5-72B** | OpenRouter | Script writing, compliance synthesis, predictive analytics |
| **Qwen 3 VL** | OpenRouter | Bank statement PDF vision extraction |
| **Kimi-K2.5** | OpenRouter (Moonshot AI) | Product photo analysis for video ads |
| **LTX-2.3** | HuggingFace Space (Lightricks) | Image-to-video generation (product photo → 8s clip) |
| **Malaysia-AI Whisper** | HuggingFace (local) | Malay/English/Iban speech-to-text |
| **DistilBERT** | Fine-tuned locally | Transaction classification (PAYMENT / ORDER / COMPLAINT) |
| **all-MiniLM-L6-v2** | SentenceTransformers | 384-dim embeddings for DEFA compliance vector search |
| **rembg (U²-Net)** | Local | Product background removal |
| **Tesseract** | Local | Receipt OCR text extraction |

---

## 📊 Model Performance (DistilBERT Classifier)

| Metric | Target | Expected |
|--------|--------|----------|
| Classification Accuracy | >85% | 89–92% |
| Macro F1 Score | >80% | 85–88% |
| Inference Time | <100ms | ~50ms |

*Trained on 1,500+ synthetic Borneo trade samples; evaluate with `notebooks/evaluate_model.py`*
