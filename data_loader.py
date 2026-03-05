# data_loader.py
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Get absolute path based on script location
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RECENT_MONTHS = int(os.getenv("RECENT_MONTHS", 6))
RECENT_WEIGHT = float(os.getenv("RECENT_WEIGHT", 2.0))
HISTORICAL_WEIGHT = float(os.getenv("HISTORICAL_WEIGHT", 1.0))
CSV_PATH = os.getenv("CSV_PATH", os.path.join(_BASE_DIR, "data", "reviews_backup.csv"))

# ── Global CSV Cache (loaded once at startup) ──────────────────────────────────
_CSV_CACHE = None
_CSV_CACHE_PATH = None
_PRODUCT_INDEX = None  # Dict mapping product_id -> list of row indices for O(1) lookup


def _get_cached_csv(csv_path: str) -> pd.DataFrame:
    """Load CSV once and cache in memory with product index"""
    global _CSV_CACHE, _CSV_CACHE_PATH, _PRODUCT_INDEX
    
    if _CSV_CACHE is not None and _CSV_CACHE_PATH == csv_path:
        return _CSV_CACHE
    
    if not os.path.exists(csv_path):
        return pd.DataFrame()
    
    print(f"📂 Loading CSV (one-time)... {csv_path}")
    raw = pd.read_csv(csv_path, dtype={"product_id": str})
    raw["review_date"] = pd.to_datetime(raw.get("review_date"), errors="coerce")
    raw = _normalize_df(raw)
    
    # Build product_id index for O(1) lookups
    print("🔧 Building product index...")
    _PRODUCT_INDEX = raw.groupby("product_id").groups
    
    _CSV_CACHE = raw
    _CSV_CACHE_PATH = csv_path
    print(f"✅ CSV loaded: {len(raw):,} reviews, {len(_PRODUCT_INDEX):,} products indexed")
    return _CSV_CACHE


def _get_reviews_by_product_id(product_id: str) -> pd.DataFrame:
    """Fast O(1) lookup using pre-built index"""
    global _PRODUCT_INDEX, _CSV_CACHE
    
    if _PRODUCT_INDEX is None or _CSV_CACHE is None:
        return pd.DataFrame()
    
    if product_id not in _PRODUCT_INDEX:
        return pd.DataFrame()
    
    indices = _PRODUCT_INDEX[product_id]
    return _CSV_CACHE.iloc[indices].copy()


def load_amazon_electronics(path: str) -> pd.DataFrame:
    """Load and normalize Amazon Electronics Reviews dataset"""
    try:
        df = pd.read_csv(path, dtype={"asin": str, "product_id": str})

        # Normalize column names
        col_map = {
            "asin": "product_id",
            "reviewText": "review_text",
            "overall": "rating",
            "unixReviewTime": "review_date",
            "reviewerID": "reviewer_id",
            "verified": "verified_purchase"
        }
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

        # Convert unix timestamp to date if needed
        if "review_date" in df.columns:
            if df["review_date"].dtype in [np.int64, np.float64]:
                df["review_date"] = pd.to_datetime(df["review_date"], unit="s")
            else:
                df["review_date"] = pd.to_datetime(df["review_date"], errors="coerce")

        df["source"] = "amazon_electronics"
        return _normalize_df(df)

    except Exception as e:
        print(f"⚠️ Could not load Amazon Electronics dataset: {e}")
        return pd.DataFrame()


def load_datafiniti(path: str) -> pd.DataFrame:
    """Load and normalize Datafiniti Amazon Reviews dataset"""
    try:
        df = pd.read_csv(path, dtype={"id": str, "product_id": str})

        col_map = {
            "id": "product_id",
            "reviews.text": "review_text",
            "reviews.rating": "rating",
            "reviews.date": "review_date",
            "reviews.username": "reviewer_id",
            "reviews.didPurchase": "verified_purchase",
            "reviews.id": "order_id"
        }
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})
        df["review_date"] = pd.to_datetime(df.get("review_date"), errors="coerce")
        df["source"] = "datafiniti"
        return _normalize_df(df)

    except Exception as e:
        print(f"⚠️ Could not load Datafiniti dataset: {e}")
        return pd.DataFrame()


def _normalize_df(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure all required columns exist with correct types"""
    required = {
        "product_id": "unknown",
        "review_text": "",
        "rating": 3.0,
        "review_date": pd.Timestamp.now(),
        "verified_purchase": False,
        "order_id": None,
        "reviewer_id": None,
        "source": "unknown"
    }
    for col, default in required.items():
        if col not in df.columns:
            df[col] = default

    df["product_id"] = df["product_id"].astype(str).str.strip()
    df["review_text"] = df["review_text"].fillna("").astype(str)
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(3.0)
    df["verified_purchase"] = df["verified_purchase"].fillna(False).astype(bool)
    df = df.dropna(subset=["review_text"])
    df = df[df["review_text"].str.len() > 10]
    return df


def merge_datasets(paths: dict) -> pd.DataFrame:
    """Merge all datasets into one unified DataFrame"""
    frames = []

    if "amazon_electronics" in paths and os.path.exists(paths["amazon_electronics"]):
        frames.append(load_amazon_electronics(paths["amazon_electronics"]))

    if "datafiniti" in paths and os.path.exists(paths["datafiniti"]):
        frames.append(load_datafiniti(paths["datafiniti"]))

    if "merged_csv" in paths and os.path.exists(paths["merged_csv"]):
        df = pd.read_csv(paths["merged_csv"])
        df["review_date"] = pd.to_datetime(df.get("review_date"), errors="coerce")
        frames.append(_normalize_df(df))

    if not frames:
        return pd.DataFrame()

    merged = pd.concat(frames, ignore_index=True)
    merged = merged.drop_duplicates(subset=["product_id", "review_text"])
    return merged


def get_reviews_for_product(product_id: str, csv_path: str = CSV_PATH) -> tuple:
    """
    Returns (DataFrame, source_info_dict)
    Recent reviews from CSV weighted 2x
    Historical from DB weighted 1x
    
    Uses O(1) indexed lookup for fast retrieval
    """
    from database import get_historical_reviews

    cutoff = datetime.now() - timedelta(days=RECENT_MONTHS * 30)

    # --- CSV DATA (O(1) indexed lookup) ---
    csv_df = pd.DataFrame()
    _get_cached_csv(csv_path)  # Ensure cache is loaded
    csv_df = _get_reviews_by_product_id(product_id)
    
    if not csv_df.empty:
        # Vectorized weight calculation (much faster than apply)
        csv_df["weight"] = np.where(
            csv_df["review_date"].notna() & (csv_df["review_date"] >= cutoff),
            RECENT_WEIGHT,
            HISTORICAL_WEIGHT
        )

    # --- COLD DATA: PostgreSQL (older than 6 months) ---
    historical_df = pd.DataFrame()
    try:
        historical_df = get_historical_reviews(product_id)
        if not historical_df.empty:
            historical_df["weight"] = HISTORICAL_WEIGHT
    except Exception as e:
        print(f"DB load warning: {e}")

    # --- MERGE ---
    frames = [f for f in [csv_df, historical_df] if not f.empty]

    recent_count = len(csv_df[csv_df["weight"] == RECENT_WEIGHT]) if not csv_df.empty else 0
    older_csv_count = len(csv_df) - recent_count

    source_info = {
        "csv_recent": f"{recent_count} reviews (last {RECENT_MONTHS} months)",
        "csv_older": f"{older_csv_count} reviews (older)",
        "historical_db": f"{len(historical_df)} reviews (PostgreSQL)",
        "total": len(csv_df) + len(historical_df),
        "recent_weight": f"{RECENT_WEIGHT}x",
        "historical_weight": f"{HISTORICAL_WEIGHT}x"
    }

    if not frames:
        return pd.DataFrame(), source_info

    merged = pd.concat(frames, ignore_index=True)
    return merged, source_info


def migrate_old_to_db(csv_path: str):
    """One-time migration: push old reviews to PostgreSQL"""
    import psycopg2
    from database import get_connection

    if not os.path.exists(csv_path):
        print("❌ CSV not found")
        return

    cutoff = datetime.now() - timedelta(days=RECENT_MONTHS * 30)
    df = pd.read_csv(csv_path)
    df["review_date"] = pd.to_datetime(df.get("review_date"), errors="coerce")
    df = _normalize_df(df)
    old = df[df["review_date"] < cutoff]

    if old.empty:
        print("No old reviews to migrate")
        return

    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for _, row in old.iterrows():
        try:
            cursor.execute("""
                INSERT INTO reviews
                (product_id, review_text, rating, review_date,
                 verified_purchase, order_id, reviewer_id, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(row.get("product_id", "")),
                str(row.get("review_text", "")),
                float(row.get("rating", 3.0)),
                row.get("review_date"),
                bool(row.get("verified_purchase", False)),
                str(row.get("order_id", "")) or None,
                str(row.get("reviewer_id", "")) or None,
                str(row.get("source", "amazon"))
            ))
            count += 1
        except Exception:
            continue

    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Migrated {count} historical reviews to PostgreSQL")
