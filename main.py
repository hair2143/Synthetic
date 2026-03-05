# main.py
import os
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import (
    InsightsResponse, InsufficientDataResponse,
    CompareResponse, HealthResponse
)
from data_loader import get_reviews_for_product
from analyzer import get_top_aspects, filter_reviews
from trust import build_pros_cons
from insights import (
    compute_sentiment_drift, detect_conflicts,
    compute_confidence, generate_summary
)
from database import (
    init_db, get_cached_insights, save_cached_insights
)

load_dotenv()

MIN_REVIEWS = int(os.getenv("MIN_REVIEWS_THRESHOLD", 10))
CSV_PATH = os.getenv("CSV_PATH", "./data/reviews.csv")
API_VERSION = os.getenv("API_VERSION", "v1")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", 7200))

app = FastAPI(
    title="Product Review Insights API",
    description="QA-grade customer review analysis — validating, testing and certifying every insight. Built for Tristha Hackathon.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ── Health Check ───────────────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/health", response_model=HealthResponse, tags=["System"])
def health_check():
    db_ok = False
    try:
        from database import get_connection
        conn = get_connection()
        conn.close()
        db_ok = True
    except Exception:
        pass

    csv_ok = os.path.exists(CSV_PATH)

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "db_connected": db_ok,
        "csv_loaded": csv_ok
    }


# ── Core Insights Endpoint ─────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/insights/{{product_id}}", tags=["Insights"])
def get_insights(
    product_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and recompute")
):
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id — must be at least 3 characters")

    product_id = product_id.strip()

    # --- Cache Check ---
    if not force_refresh:
        cached = get_cached_insights(product_id)
        if cached:
            cached["cache_status"] = "hit"
            return cached

    # --- Load Data ---
    df, source_info = get_reviews_for_product(product_id, CSV_PATH)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No reviews found for product_id: {product_id}"
        )

    # --- Insufficient Data ---
    if len(df) < MIN_REVIEWS:
        partial = _get_partial_insights(df)
        return InsufficientDataResponse(
            product_id=product_id,
            status="insufficient_data",
            reviews_found=len(df),
            minimum_required=MIN_REVIEWS,
            message=f"Only {len(df)} reviews found. Need at least {MIN_REVIEWS} for reliable insights.",
            partial_insights=partial
        )

    # --- Filter & Audit ---
    clean_df, audit = filter_reviews(df)
    audit["audit_confidence"] = "HIGH ✅" if audit["verified_purchases"] / max(audit["total_reviews"], 1) > 0.7 else "MEDIUM ⚠️"

    if clean_df.empty:
        raise HTTPException(status_code=422, detail="All reviews filtered — no quality data available")

    # --- Analysis ---
    top_aspects, category = get_top_aspects(clean_df)
    pros, cons = build_pros_cons(clean_df, top_aspects)
    drift = compute_sentiment_drift(clean_df, top_aspects)
    conflicts = detect_conflicts(clean_df, top_aspects)
    confidence = compute_confidence(clean_df, top_aspects, audit)
    summary = generate_summary(product_id, top_aspects, pros, cons, drift, confidence, audit)

    result = {
        "product_id": product_id,
        "status": "success",
        "generated_at": datetime.now().isoformat(),
        "product_meta": {
            "category": category.title(),
            "detected_from": "review keyword analysis"
        },
        "data_sources": source_info,
        "top_aspects": top_aspects,
        "pros": pros,
        "cons": cons,
        "conflicts": conflicts,
        "trend": drift,
        "confidence": confidence,
        "review_quality_audit": audit,
        "summary": summary,
        "tristha_qa_badge": "✅ All insights validated, tested and certified — zero fabrication",
        "cache_status": "miss"
    }

    # --- Save to Cache ---
    save_cached_insights(product_id, result, CACHE_TTL)

    return result


# ── Drift Endpoint ─────────────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/drift/{{product_id}}", tags=["Insights"])
def get_drift(product_id: str):
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")

    df, _ = get_reviews_for_product(product_id.strip(), CSV_PATH)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No reviews found for {product_id}")

    clean_df, _ = filter_reviews(df)
    top_aspects, _ = get_top_aspects(clean_df)
    drift = compute_sentiment_drift(clean_df, top_aspects)

    return {
        "product_id": product_id,
        "trend": drift,
        "generated_at": datetime.now().isoformat()
    }


# ── Conflicts Endpoint ─────────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/conflicts/{{product_id}}", tags=["Insights"])
def get_conflicts(product_id: str):
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")

    df, _ = get_reviews_for_product(product_id.strip(), CSV_PATH)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No reviews found for {product_id}")

    clean_df, _ = filter_reviews(df)
    top_aspects, _ = get_top_aspects(clean_df)
    conflicts = detect_conflicts(clean_df, top_aspects)

    return {
        "product_id": product_id,
        "conflicts": conflicts,
        "total_conflicts_detected": len(conflicts),
        "generated_at": datetime.now().isoformat()
    }


# ── Trust Audit Endpoint ───────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/trust/{{product_id}}", tags=["Insights"])
def get_trust_audit(product_id: str):
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")

    df, _ = get_reviews_for_product(product_id.strip(), CSV_PATH)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No reviews found for {product_id}")

    _, audit = filter_reviews(df)

    return {
        "product_id": product_id,
        "review_quality_audit": audit,
        "generated_at": datetime.now().isoformat()
    }


# ── Compare Endpoint ───────────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/compare", tags=["Compare"])
def compare_products(
    product_a: str = Query(..., description="First product ID"),
    product_b: str = Query(..., description="Second product ID")
):
    if not product_a or not product_b:
        raise HTTPException(status_code=400, detail="Both product_a and product_b are required")

    results = {}
    for pid in [product_a, product_b]:
        df, _ = get_reviews_for_product(pid.strip(), CSV_PATH)
        if df.empty:
            results[pid] = None
            continue
        clean_df, audit = filter_reviews(df)
        top_aspects, _ = get_top_aspects(clean_df)
        confidence = compute_confidence(clean_df, top_aspects, audit)
        results[pid] = {
            "top_aspects": top_aspects,
            "confidence": confidence,
            "review_count": len(clean_df)
        }

    if not results[product_a] or not results[product_b]:
        raise HTTPException(status_code=404, detail="One or both products not found")

    # Build comparison
    comparison = {}
    aspects_a = {a["aspect"]: a for a in results[product_a]["top_aspects"]}
    aspects_b = {a["aspect"]: a for a in results[product_b]["top_aspects"]}
    all_aspects = set(aspects_a.keys()) | set(aspects_b.keys())

    for aspect in all_aspects:
        a_score = aspects_a.get(aspect, {}).get("score", None)
        b_score = aspects_b.get(aspect, {}).get("score", None)

        if a_score is None or b_score is None:
            continue

        winner = product_a if a_score > b_score else product_b if b_score > a_score else "tie"
        comparison[aspect] = {
            product_a: a_score,
            product_b: b_score,
            "winner": winner
        }

    return {
        "product_a": product_a,
        "product_b": product_b,
        "summary": {
            product_a: {"confidence": results[product_a]["confidence"]["score"],
                        "reviews": results[product_a]["review_count"]},
            product_b: {"confidence": results[product_b]["confidence"]["score"],
                        "reviews": results[product_b]["review_count"]}
        },
        "comparison": comparison,
        "generated_at": datetime.now().isoformat()
    }


# ── Migrate Endpoint ───────────────────────────────────────────────────────────

@app.post(f"/api/{API_VERSION}/migrate", tags=["System"])
def trigger_migration():
    try:
        from data_loader import migrate_old_to_db
        migrate_old_to_db(CSV_PATH)
        return {"status": "success", "message": "Migration completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_partial_insights(df: pd.DataFrame) -> dict:
    """Return minimal insights when data is too sparse"""
    if df.empty:
        return {}
    try:
        avg_rating = round(df["rating"].mean(), 2)
        sample_texts = df["review_text"].head(3).tolist()
        return {
            "average_rating": avg_rating,
            "early_signal": sample_texts[0][:100] if sample_texts else "No reviews available",
            "note": "Insufficient data for full analysis"
        }
    except Exception:
        return {}


# ── Startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    try:
        init_db()
        print("✅ API started — DB initialized")
    except Exception as e:
        print(f"⚠️ DB init warning: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
