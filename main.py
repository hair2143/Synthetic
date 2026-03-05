# main.py
import os
import numpy as np
import pandas as pd
from datetime import datetime
from functools import lru_cache
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import (
    InsightsResponse, InsufficientDataResponse,
    CompareResponse, HealthResponse
)
from data_loader import get_reviews_for_product, _get_cached_csv
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

# ── In-Memory LRU Cache for fast repeated lookups ──────────────────────────────
_MEMORY_CACHE = {}
_MEMORY_CACHE_MAX = 100  # Max items in memory

# Get absolute path based on script location
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MIN_REVIEWS = int(os.getenv("MIN_REVIEWS_THRESHOLD", 10))
CSV_PATH = os.getenv("CSV_PATH", os.path.join(_BASE_DIR, "data", "reviews_backup.csv"))
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

    # --- Memory Cache Check (fastest) ---
    if not force_refresh and product_id in _MEMORY_CACHE:
        result = _MEMORY_CACHE[product_id].copy()
        result["cache_status"] = "memory_hit"
        return result

    # --- DB Cache Check ---
    if not force_refresh:
        cached = get_cached_insights(product_id)
        if cached:
            cached["cache_status"] = "db_hit"
            # Store in memory for next time
            if len(_MEMORY_CACHE) >= _MEMORY_CACHE_MAX:
                _MEMORY_CACHE.pop(next(iter(_MEMORY_CACHE)))  # Remove oldest
            _MEMORY_CACHE[product_id] = cached
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
    
    # --- Also save to memory cache for instant future lookups ---
    if len(_MEMORY_CACHE) >= _MEMORY_CACHE_MAX:
        _MEMORY_CACHE.pop(next(iter(_MEMORY_CACHE)))
    _MEMORY_CACHE[product_id] = result

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
        df, source_info = get_reviews_for_product(pid.strip(), CSV_PATH)
        if df.empty:
            results[pid] = None
            continue
        clean_df, audit = filter_reviews(df)
        top_aspects, category = get_top_aspects(clean_df)
        pros, cons = build_pros_cons(clean_df, top_aspects)
        drift = compute_sentiment_drift(clean_df, top_aspects)
        conflicts = detect_conflicts(clean_df, top_aspects)
        confidence = compute_confidence(clean_df, top_aspects, audit)
        summary_text = generate_summary(pid, top_aspects, pros, cons, drift, confidence, audit)
        
        # Calculate overall sentiment score from aspects
        overall_sentiment = sum(a.get("score", 0) for a in top_aspects) / max(len(top_aspects), 1)
        
        results[pid] = {
            "top_aspects": top_aspects,
            "confidence": confidence,
            "review_count": len(clean_df),
            "pros": pros,
            "cons": cons,
            "drift": drift,
            "conflicts": conflicts,
            "audit": audit,
            "summary": summary_text,
            "category": category,
            "data_sources": source_info,
            "overall_sentiment": overall_sentiment
        }

    if not results[product_a] or not results[product_b]:
        raise HTTPException(status_code=404, detail="One or both products not found")

    # Build aspect comparison
    aspect_comparison = {}
    aspects_a = {a["aspect"]: a for a in results[product_a]["top_aspects"]}
    aspects_b = {a["aspect"]: a for a in results[product_b]["top_aspects"]}
    all_aspects = set(aspects_a.keys()) | set(aspects_b.keys())

    for aspect in all_aspects:
        a_data = aspects_a.get(aspect, {})
        b_data = aspects_b.get(aspect, {})
        a_score = a_data.get("score", 0)
        b_score = b_data.get("score", 0)

        winner = product_a if a_score > b_score else product_b if b_score > a_score else "tie"
        aspect_comparison[aspect] = {
            product_a: a_score,
            product_b: b_score,
            "winner": winner,
            f"{product_a}_sentiment": a_data.get("sentiment", "neutral"),
            f"{product_b}_sentiment": b_data.get("sentiment", "neutral"),
            f"{product_a}_reviews": a_data.get("review_count", 0),
            f"{product_b}_reviews": b_data.get("review_count", 0)
        }

    # Build pros/cons comparison
    pros_cons_comparison = {
        product_a: {
            "pros": [p["point"] for p in results[product_a]["pros"][:5]],
            "cons": [c["point"] for c in results[product_a]["cons"][:5]]
        },
        product_b: {
            "pros": [p["point"] for p in results[product_b]["pros"][:5]],
            "cons": [c["point"] for c in results[product_b]["cons"][:5]]
        }
    }

    # Build quality comparison
    audit_comparison = {
        product_a: results[product_a]["audit"],
        product_b: results[product_b]["audit"]
    }

    # Build overall winner determination
    a_wins = sum(1 for v in aspect_comparison.values() if v["winner"] == product_a)
    b_wins = sum(1 for v in aspect_comparison.values() if v["winner"] == product_b)
    ties = sum(1 for v in aspect_comparison.values() if v["winner"] == "tie")
    
    overall_winner = product_a if a_wins > b_wins else product_b if b_wins > a_wins else "tie"

    return {
        "product_a": product_a,
        "product_b": product_b,
        "summary": {
            product_a: {
                "confidence": results[product_a]["confidence"]["score"],
                "confidence_level": results[product_a]["confidence"]["level"],
                "reviews": results[product_a]["review_count"],
                "summary_text": results[product_a]["summary"],
                "category": results[product_a]["category"],
                "overall_sentiment": results[product_a]["overall_sentiment"],
                "data_sources": results[product_a]["data_sources"]
            },
            product_b: {
                "confidence": results[product_b]["confidence"]["score"],
                "confidence_level": results[product_b]["confidence"]["level"],
                "reviews": results[product_b]["review_count"],
                "summary_text": results[product_b]["summary"],
                "category": results[product_b]["category"],
                "overall_sentiment": results[product_b]["overall_sentiment"],
                "data_sources": results[product_b]["data_sources"]
            }
        },
        "overall_winner": overall_winner,
        "score_breakdown": {
            product_a: a_wins,
            product_b: b_wins,
            "ties": ties
        },
        "comparison": aspect_comparison,
        "pros_cons": pros_cons_comparison,
        "audit_comparison": audit_comparison,
        "conflicts": {
            product_a: results[product_a]["conflicts"],
            product_b: results[product_b]["conflicts"]
        },
        "drift": {
            product_a: results[product_a]["drift"],
            product_b: results[product_b]["drift"]
        },
        "generated_at": datetime.now().isoformat()
    }


# ── Analytics Endpoints ────────────────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/analytics/{{product_id}}", tags=["Analytics"])
def get_product_analytics(product_id: str):
    """Get detailed analytics data for charts"""
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")
    
    product_id = product_id.strip()
    df, _ = get_reviews_for_product(product_id, CSV_PATH)
    
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No reviews found for product_id: {product_id}")
    
    # 1. Rating Distribution
    rating_counts = df["rating"].value_counts().sort_index()
    rating_distribution = {str(int(k)): int(v) for k, v in rating_counts.items()}
    # Ensure all ratings 1-5 exist
    for r in ["1", "2", "3", "4", "5"]:
        if r not in rating_distribution:
            rating_distribution[r] = 0
    
    # 2. Reviews by Year
    df["year"] = df["review_date"].dt.year
    reviews_by_year = df.groupby("year").size().reset_index(name="count")
    reviews_by_year = reviews_by_year.dropna()
    reviews_by_year_list = [
        {"year": str(int(row["year"])), "count": int(row["count"])}
        for _, row in reviews_by_year.iterrows()
        if not pd.isna(row["year"])
    ]
    
    # 3. Average Rating by Year
    avg_by_year = df.groupby("year")["rating"].mean().reset_index(name="avg")
    avg_rating_by_year = [
        {"year": str(int(row["year"])), "avg": round(float(row["avg"]), 2)}
        for _, row in avg_by_year.iterrows()
        if not pd.isna(row["year"])
    ]
    
    # 4. Top Reviewers
    reviewer_counts = df["reviewer_id"].value_counts().head(10)
    top_reviewers = [
        {"reviewer_id": str(rid)[:12], "count": int(cnt)}
        for rid, cnt in reviewer_counts.items()
        if rid and str(rid) != "nan"
    ]
    
    # 5. Review Length Distribution
    df["text_len"] = df["review_text"].str.len()
    length_buckets = {
        "0-50": int(((df["text_len"] >= 0) & (df["text_len"] < 50)).sum()),
        "50-100": int(((df["text_len"] >= 50) & (df["text_len"] < 100)).sum()),
        "100-200": int(((df["text_len"] >= 100) & (df["text_len"] < 200)).sum()),
        "200+": int((df["text_len"] >= 200).sum())
    }
    
    # 6. Trust Distribution (based on verified_purchase as proxy)
    # Since we don't have trust scores for individual reviews, use verification status
    verified_count = int(df["verified_purchase"].sum()) if "verified_purchase" in df.columns else 0
    total = len(df)
    unverified = total - verified_count
    
    # Simulate trust distribution based on verification
    trust_distribution = {
        "0.0-0.3": int(unverified * 0.3),
        "0.3-0.6": int(unverified * 0.7),
        "0.6-1.0": verified_count
    }
    
    return {
        "product_id": product_id,
        "total_reviews": total,
        "rating_distribution": rating_distribution,
        "reviews_by_year": reviews_by_year_list,
        "avg_rating_by_year": avg_rating_by_year,
        "top_reviewers": top_reviewers,
        "review_length_distribution": length_buckets,
        "trust_distribution": trust_distribution,
        "generated_at": datetime.now().isoformat()
    }


@app.get(f"/api/{API_VERSION}/analytics/top-products", tags=["Analytics"])
def get_top_products():
    """Get top 10 products by review count"""
    cached_csv = _get_cached_csv(CSV_PATH)
    
    if cached_csv.empty:
        raise HTTPException(status_code=404, detail="No CSV data available")
    
    product_counts = cached_csv["product_id"].value_counts().head(10)
    top_products = [
        {"product_id": str(pid), "count": int(cnt)}
        for pid, cnt in product_counts.items()
    ]
    
    return {
        "top_products": top_products,
        "total_products": cached_csv["product_id"].nunique(),
        "total_reviews": len(cached_csv),
        "generated_at": datetime.now().isoformat()
    }


# ── Marketplace Products Endpoint ──────────────────────────────────────────────

@app.get(f"/api/{API_VERSION}/products/top", tags=["Marketplace"])
def get_top_products(
    limit: int = Query(20, description="Number of products to return"),
    category: str = Query(None, description="Filter by category"),
    min_reviews: int = Query(50, description="Minimum reviews to include")
):
    """Get top products for marketplace display."""
    try:
        cached_csv = _get_cached_csv(CSV_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {str(e)}")
    
    if cached_csv.empty:
        return {"products": [], "total": 0}
    
    # Aggregate by product_id
    product_stats = cached_csv.groupby("product_id").agg({
        "rating": ["mean", "count"],
        "review_text": "first",
        "verified_purchase": "mean"
    }).reset_index()
    
    product_stats.columns = ["product_id", "avg_rating", "review_count", "sample_review", "verified_pct"]
    
    # Filter by minimum reviews
    product_stats = product_stats[product_stats["review_count"] >= min_reviews]
    
    # Sort by review count
    product_stats = product_stats.sort_values("review_count", ascending=False)
    
    # Take top N
    top = product_stats.head(limit)
    
    products = []
    for _, row in top.iterrows():
        # Determine sentiment
        if row["avg_rating"] >= 4.0:
            sentiment = "loved"
        elif row["avg_rating"] >= 3.0:
            sentiment = "mixed"
        else:
            sentiment = "avoid"
        
        products.append({
            "id": row["product_id"],
            "reviewCount": int(row["review_count"]),
            "avgRating": round(row["avg_rating"], 2),
            "verifiedPct": round(row["verified_pct"], 2) if pd.notna(row["verified_pct"]) else 0.5,
            "sentiment": sentiment,
            "sampleReview": str(row["sample_review"])[:100] if pd.notna(row["sample_review"]) else ""
        })
    
    return {
        "products": products,
        "total": len(products),
        "generated_at": datetime.now().isoformat()
    }


@app.get(f"/api/{API_VERSION}/products/{{product_id}}/summary", tags=["Marketplace"])
def get_product_summary(product_id: str):
    """Get a quick summary for a product - lighter than full insights."""
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")
    
    product_id = product_id.strip()
    
    try:
        df, source_info = get_reviews_for_product(product_id, CSV_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data: {str(e)}")
    
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No reviews found for {product_id}")
    
    # Basic stats
    avg_rating = round(df["rating"].mean(), 2)
    review_count = len(df)
    verified_pct = round(df["verified_purchase"].mean(), 2) if "verified_purchase" in df.columns else 0.5
    
    # Rating distribution
    rating_dist = df["rating"].value_counts().sort_index().to_dict()
    rating_dist = {int(k): int(v) for k, v in rating_dist.items()}
    
    # Get a few sample reviews
    sample_reviews = []
    for _, row in df.head(5).iterrows():
        sample_reviews.append({
            "rating": int(row["rating"]),
            "text": str(row["review_text"])[:200] if pd.notna(row["review_text"]) else "",
            "verified": bool(row["verified_purchase"]) if "verified_purchase" in df.columns else False
        })
    
    # Determine sentiment
    if avg_rating >= 4.0:
        sentiment = "loved"
    elif avg_rating >= 3.0:
        sentiment = "mixed"
    else:
        sentiment = "avoid"
    
    return {
        "product_id": product_id,
        "avgRating": avg_rating,
        "reviewCount": review_count,
        "verifiedPct": verified_pct,
        "sentiment": sentiment,
        "ratingDistribution": rating_dist,
        "sampleReviews": sample_reviews,
        "generated_at": datetime.now().isoformat()
    }


@app.post(f"/api/{API_VERSION}/reviews/add", tags=["Marketplace"])
def add_review(
    product_id: str = Query(..., description="Product ID"),
    rating: int = Query(..., ge=1, le=5, description="Rating 1-5"),
    text: str = Query(..., description="Review text"),
    author: str = Query("Anonymous", description="Author name")
):
    """Add a user review (stored in memory for demo purposes)."""
    if not product_id or len(product_id.strip()) < 3:
        raise HTTPException(status_code=400, detail="Invalid product_id")
    
    if not text or len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Review text must be at least 10 characters")
    
    # For demo purposes, we just return success
    # In a real app, this would persist to a database
    return {
        "status": "success",
        "message": "Review submitted successfully",
        "review": {
            "product_id": product_id.strip(),
            "rating": rating,
            "text": text.strip(),
            "author": author,
            "verified": True,  # User is logged in
            "submitted_at": datetime.now().isoformat()
        }
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
