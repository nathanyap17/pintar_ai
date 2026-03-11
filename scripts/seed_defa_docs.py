"""
DEFA Document Seeder — Populates Convex with regulatory documents for RAG.
Run this script to seed the compliance knowledge base with DEFA framework documents.

Usage:
    python scripts/seed_defa_docs.py
"""

import os
import sys
import json

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "")


def get_embedding_model():
    """Load SentenceTransformer model."""
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("all-MiniLM-L6-v2")


# ─── Sample DEFA Regulatory Documents ───
DEFA_DOCUMENTS = [
    {
        "title": "ASEAN DEFA — Digital Trade Standards (2025)",
        "category": "digital_trade",
        "source": "ASEAN Secretariat / DEFA Framework",
        "content": """The ASEAN Digital Economy Framework Agreement (DEFA) establishes rules for
cross-border digital trade among member states. Key provisions include:
- E-invoicing interoperability standards for MSMEs
- Digital payment corridor recognition
- Cross-border data flow principles with localization exceptions
- Consumer protection in e-commerce with simplified dispute resolution
- De minimis thresholds for duty-free imports (varies by country, typically USD 100-500)
MSMEs benefit from simplified customs procedures for shipments under de minimis thresholds.""",
    },
    {
        "title": "Sarawak Agricultural Exports — Phytosanitary Requirements",
        "category": "agriculture",
        "source": "Malaysian Department of Agriculture / Sarawak",
        "content": """Export of agricultural products from Sarawak requires:
1. Phytosanitary Certificate from DOA Sarawak
2. FAMA export license for fresh fruits and vegetables
3. Fumigation certificate for wood/rattan products
4. Pepper Board certification for Sarawak pepper exports
Key products: Sarawak pepper (both black and white), tropical fruits, sabah tea, wild honey
Special status: Sarawak pepper has GI (Geographical Indication) status
Transit: Kuching International Airport, Sibu Port, Bintulu Port""",
    },
    {
        "title": "ASEAN Harmonized Tariff Nomenclature — Handicraft Products",
        "category": "handicrafts",
        "source": "ASEAN Trade Repository",
        "content": """Handicraft products under AHTN classifications:
- HS 4602: Basketwork, wickerwork (rattan, bamboo) — Generally 0-5% duty under ATIGA
- HS 5805: Hand-woven tapestries and textiles — 0% duty for ASEAN origin
- HS 7113-7117: Jewelry and bijouterie — 0-10% depending on material
- HS 4421: Wood articles (beadwork frames, carvings) — 0-5% under ATIGA
Rules of Origin: Product must have at least 40% Regional Value Content (RVC)
or satisfy Change in Tariff Classification (CTC) criteria.
Documentation: Certificate of Origin Form D required for ATIGA preferential rates.""",
    },
    {
        "title": "Malaysia-Singapore Cross-Border E-Commerce Procedures",
        "category": "ecommerce",
        "source": "Royal Malaysian Customs Department",
        "content": """For MSME e-commerce shipments Malaysia → Singapore:
1. De minimis threshold: SGD 400 / MYR 500 (no GST for shipments below this)
2. Prohibited items: Chewing gum, certain animals, weapons
3. TradeNet declaration required for commercial shipments
4. Preferred channels: Pos Malaysia EMS, DHL eCommerce, Ninja Van
5. Labeling: All products must have English descriptions
6. Food items: SFA import permit required, halal certification advantageous
Average clearance time: 1-3 business days
DEFA simplification: Digital invoice accepted; no physical document needed for sub-SGD 400.""",
    },
    {
        "title": "Indonesia Import Regulations for Malaysian Products",
        "category": "ecommerce",
        "source": "Indonesian Ministry of Trade",
        "content": """Import requirements for Malaysian products entering Indonesia:
1. SNI certification mandatory for regulated products (electronics, toys, textiles)
2. BPOM approval required for food, cosmetics, and traditional medicine
3. Halal certification (LPPOM MUI) required for food products since Oct 2024
4. De minimis threshold: USD 3 per shipment (very low)
5. Import duty rates under ATIGA: 0-5% for most manufactured goods
6. Restricted items: Used clothing, certain chemicals, alcohol
Required documents: Commercial Invoice, Packing List, Bill of Lading, CoO Form D
E-commerce platform: Products sold through Tokopedia/Shopee ID may need API registration.""",
    },
    {
        "title": "Cross-Border Logistics for Borneo Island",
        "category": "logistics",
        "source": "Sarawak Trade & Industry Ministry",
        "content": """Unique logistics considerations for Sarawak/Borneo exports:
1. Direct shipping routes: Kuching → Singapore (daily), Kuching → Pontianak (3x weekly)
2. Bintulu Port: Bulk cargo for agricultural exports
3. Miri → Brunei: Land border at Sungai Tujoh (simplified procedures)
4. Air cargo: Kuching International Airport has bonded warehouse facilities
5. Cold chain: Limited to Kuching facility; frozen products require advance booking
6. Customs hours: Sungai Tujoh (5am-10pm), Tebedu (6am-6pm)
DEFA impact: Digital customs declarations being piloted, reducing clearance from hours to minutes.
Special zones: SCORE zones in Samalaju offer tax incentives for exporters.""",
    },
]


def seed_documents():
    """Seed all DEFA documents into Convex with embeddings."""
    if not CONVEX_URL:
        print("ERROR: Set NEXT_PUBLIC_CONVEX_URL environment variable first!")
        print("Run 'npx convex dev' in the frontend directory to get your URL.")
        sys.exit(1)

    from convex import ConvexClient

    client = ConvexClient(CONVEX_URL)
    model = get_embedding_model()

    print(f"Seeding {len(DEFA_DOCUMENTS)} documents into Convex...")
    print(f"Using Convex at: {CONVEX_URL}")
    print()

    for i, doc in enumerate(DEFA_DOCUMENTS, 1):
        # Generate embedding
        combined_text = f"{doc['title']} {doc['content']}"
        embedding = model.encode(combined_text, normalize_embeddings=True).tolist()

        # Insert into Convex
        client.mutation(
            "compliance:insert",
            {
                "title": doc["title"],
                "content": doc["content"],
                "source": doc["source"],
                "category": doc["category"],
                "embedding": embedding,
            },
        )

        print(f"  [{i}/{len(DEFA_DOCUMENTS)}] ✅ {doc['title'][:60]}...")

    print()
    print(f"Done! {len(DEFA_DOCUMENTS)} documents seeded into Convex.")
    print("Vector search is now available for compliance queries.")


if __name__ == "__main__":
    seed_documents()
