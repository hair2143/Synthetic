# 🔍 Product Review Insights API
> A QA tool for customer reviews — validating, testing and certifying every insight. Built for Synthetix Hackathon.

---

## What It Does

Takes a product ID → reads thousands of reviews → returns **evidence-backed insights** with zero hallucination.

Every pro and con is proven by real review quotes. No AI invention. No fabrication. That's Synthetix thinking.

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Evidence Fingerprinting | Every pro/con links back to a real review ID |
| 2 | Sentiment Drift | Detects if quality is improving or declining over time |
| 3 | Aspect Conflict Detection | Finds aspects where buyers strongly disagree |
| 4 | Explainable Confidence | Score broken down into 4 measurable factors |
| 5 | Smart "Not Enough Data" | Graceful degradation with partial insights |
| 6 | Purchase Verification | Trust score per review — verified buyers weighted 3x |
| 7 | Review Quality Audit | Filters fake, non-English, low-quality reviews |
| 8 | Hybrid Data Architecture | CSV (last 6mo, 2x weight) + PostgreSQL (historical) |

---

## Tech Stack

- **API**: FastAPI + Pydantic
- **NLP**: spaCy + VADER Sentiment
- **Database**: PostgreSQL (historical) + CSV (recent)
- **Frontend**: React + Tailwind + Recharts
- **Tests**: pytest

---

## Setup

### 1. Clone & Install Backend

```bash
git clone https://github.com/yourusername/synthetix.git
cd synthetix

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE synthetix_reviews;"

# Tables are auto-created on first startup
```

### 4. Add Dataset

Place your CSV at `./data/reviews.csv` with columns:
```
product_id, review_text, rating, review_date
```

Supports Amazon Electronics Reviews + Datafiniti format (auto-detected).

### 5. Migrate Historical Data

```bash
python -c "from data_loader import migrate_old_to_db; migrate_old_to_db('./data/reviews.csv')"
```

### 6. Run API

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 7. Run Frontend (Optional)

```bash
cd frontend
npm install
npm start
```

Frontend available at: http://localhost:3000

---

## API Endpoints

### Get Full Insights
```
GET /api/v1/insights/{product_id}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/insights/B07XJ8C8F5
```

**Response:**
```json
{
  "product_id": "B07XJ8C8F5",
  "status": "success",
  "top_aspects": [
    { "aspect": "battery life", "sentiment": "positive", "score": 0.82, "review_count": 847 }
  ],
  "pros": [
    {
      "point": "Excellent battery life praised by 847 reviewers",
      "evidence": [
        {
          "review_id": "R4521",
          "quote": "Easily lasts 2 full days on a single charge",
          "verified": true,
          "trust_score": 0.94,
          "badge": "✅ VERIFIED BUYER"
        }
      ]
    }
  ],
  "confidence": { "score": 0.87, "level": "HIGH ✅" },
  "synthetix_qa_badge": "✅ All insights validated, tested and certified — zero fabrication"
}
```

---

### Get Sentiment Drift
```
GET /api/v1/drift/{product_id}
```

```bash
curl http://localhost:8000/api/v1/drift/B07XJ8C8F5
```

---

### Get Aspect Conflicts
```
GET /api/v1/conflicts/{product_id}
```

```bash
curl http://localhost:8000/api/v1/conflicts/B07XJ8C8F5
```

---

### Compare Two Products
```
GET /api/v1/compare?product_a=B07XJ8C8F5&product_b=B08N5WRWNW
```

```bash
curl "http://localhost:8000/api/v1/compare?product_a=B07XJ8C8F5&product_b=B08N5WRWNW"
```

---

### Review Trust Audit
```
GET /api/v1/trust/{product_id}
```

---

### Health Check
```
GET /api/v1/health
```

---

## Run Tests

```bash
pytest tests/ -v
```

Expected: 15 tests, all passing ✅

---

## Architecture

```
CSV (last 6 months)     PostgreSQL (6mo+)
      ↓  weight=2x            ↓  weight=1x
      └──────────┬────────────┘
                 ↓
           Merge Reviews
                 ↓
        Filter & Language Audit
                 ↓
         Extract Aspects (spaCy)
                 ↓
       Sentiment Analysis (VADER)
                 ↓
      Evidence Selection (verified first)
                 ↓
         Trust Scoring per review
                 ↓
       Confidence Score computation
                 ↓
            API Response
```

---

## Response Fields

| Field | Description |
|-------|-------------|
| `top_aspects` | Main topics with sentiment score |
| `pros` | Positive findings with verified evidence |
| `cons` | Negative findings with verified evidence |
| `conflicts` | Aspects where buyers strongly disagree |
| `trend` | Sentiment direction over time |
| `confidence` | Score + breakdown of why |
| `review_quality_audit` | How many reviews were verified/filtered |
| `data_sources` | Which data came from CSV vs PostgreSQL |
| `summary` | Plain English summary of findings |
| `synthetix_qa_badge` | QA certification stamp |

---

## Key Design Decisions

**No hallucination guarantee**: Pros and cons are only generated if real review quotes support them. If evidence count is 0, the item is excluded.

**Weighted recency**: Reviews from the last 6 months carry 2x weight in sentiment scoring, making insights reflect current product quality.

**Trust scoring**: Verified purchase buyers are weighted 3x. Suspected fake reviews are flagged and excluded.

**Graceful degradation**: Products with fewer than 10 reviews return partial insights rather than an error.

---

*Built for Synthetix Hackathon — QA thinking applied to customer intelligence.*
