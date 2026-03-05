# database.py
import os
import psycopg2
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "tristha_reviews"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": int(os.getenv("DB_PORT", 5432))
}

RECENT_MONTHS = int(os.getenv("RECENT_MONTHS", 6))


def get_engine():
    url = (
        f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
        f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    )
    return create_engine(url)


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def init_db():
    """Create all tables and indexes"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(100) NOT NULL,
            review_text TEXT NOT NULL,
            rating FLOAT,
            review_date DATE,
            verified_purchase BOOLEAN DEFAULT FALSE,
            order_id VARCHAR(100),
            reviewer_id VARCHAR(100),
            review_count INT DEFAULT 1,
            source VARCHAR(50) DEFAULT 'amazon',
            weight FLOAT DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS aspects_cache (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(100),
            aspect VARCHAR(200),
            sentiment VARCHAR(20),
            score FLOAT,
            review_count INT,
            last_updated TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS insights_cache (
            product_id VARCHAR(100) PRIMARY KEY,
            cached_result JSONB,
            generated_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_reviews_product_date
            ON reviews(product_id, review_date);

        CREATE INDEX IF NOT EXISTS idx_reviews_product_id
            ON reviews(product_id);
    """)

    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Database initialized successfully")


def get_historical_reviews(product_id: str) -> pd.DataFrame:
    """Fetch reviews older than 6 months from PostgreSQL"""
    cutoff = datetime.now() - timedelta(days=RECENT_MONTHS * 30)

    engine = get_engine()
    query = """
        SELECT
            product_id, review_text, rating, review_date,
            verified_purchase, order_id, reviewer_id,
            review_count, source, 1.0 as weight
        FROM reviews
        WHERE product_id = :product_id
        AND review_date < :cutoff
        ORDER BY review_date DESC
    """
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn, params={
            "product_id": product_id,
            "cutoff": cutoff
        })
    return df


def get_cached_insights(product_id: str):
    """Return cached result if still valid"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cached_result FROM insights_cache
            WHERE product_id = %s AND expires_at > NOW()
        """, (product_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


def save_cached_insights(product_id: str, result: dict, ttl_seconds: int = 7200):
    """Save computed insights to cache"""
    try:
        import json
        conn = get_connection()
        cursor = conn.cursor()
        expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        cursor.execute("""
            INSERT INTO insights_cache (product_id, cached_result, expires_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE
            SET cached_result = EXCLUDED.cached_result,
                generated_at = NOW(),
                expires_at = EXCLUDED.expires_at
        """, (product_id, json.dumps(result), expires_at))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Cache save warning: {e}")
