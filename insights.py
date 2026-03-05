# insights.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from analyzer import get_sentiment_score, preprocess_text, ASPECT_SEEDS


# ── Sentiment Drift ────────────────────────────────────────────────────────────

def compute_sentiment_drift(df: pd.DataFrame, top_aspects: list) -> dict:
    """
    Compare recent (CSV/last 6mo) vs historical (DB) sentiment per aspect.
    Detects improving / declining / stable trends.
    """
    if df.empty or "review_date" not in df.columns:
        return {}

    cutoff = datetime.now() - timedelta(days=180)
    df["review_date"] = pd.to_datetime(df["review_date"], errors="coerce")

    recent = df[df["review_date"] >= cutoff].copy()
    historical = df[df["review_date"] < cutoff].copy()

    if recent.empty or historical.empty:
        return {}

    drift_results = {}

    for aspect_data in top_aspects[:5]:
        aspect = aspect_data["aspect"]
        keywords = aspect.lower().split()

        recent_scores = _aspect_scores_for(recent, keywords)
        hist_scores = _aspect_scores_for(historical, keywords)

        if not recent_scores or not hist_scores:
            continue

        recent_avg = np.mean(recent_scores)
        hist_avg = np.mean(hist_scores)
        delta = recent_avg - hist_avg

        if delta < -0.15:
            direction = "declining"
            alert = f"⚠️ {aspect.title()} sentiment dropped {abs(delta)*100:.0f}% recently"
        elif delta > 0.15:
            direction = "improving"
            alert = f"✅ {aspect.title()} sentiment improved {delta*100:.0f}% recently"
        else:
            direction = "stable"
            alert = f"ℹ️ {aspect.title()} sentiment remains stable"

        drift_results[aspect] = {
            "recent_score": round((recent_avg + 1) / 2, 3),
            "historical_score": round((hist_avg + 1) / 2, 3),
            "delta": round(delta, 3),
            "direction": direction,
            "alert": alert,
            "recent_review_count": len(recent_scores),
            "historical_review_count": len(hist_scores)
        }

    return drift_results


def _aspect_scores_for(df: pd.DataFrame, keywords: list) -> list:
    scores = []
    for text in df["review_text"]:
        clean = str(text).lower()
        if any(kw in clean for kw in keywords):
            scores.append(get_sentiment_score(text))
    return scores


# ── Conflict Detection ─────────────────────────────────────────────────────────

def detect_conflicts(df: pd.DataFrame, top_aspects: list) -> list:
    """
    Find aspects where buyers strongly disagree.
    Conflict score = how polarized reviews are on this aspect.
    """
    conflicts = []

    for aspect_data in top_aspects:
        aspect = aspect_data["aspect"]
        keywords = aspect.lower().split()
        agreement = aspect_data.get("agreement_ratio", 1.0)

        # Low agreement = high conflict
        conflict_score = round(1 - agreement, 3)

        if conflict_score < 0.40:
            continue

        # Find best pro and con sentence for this aspect
        pro_quote = ""
        con_quote = ""

        for _, row in df.iterrows():
            text = str(row.get("review_text", ""))
            if not any(kw in text.lower() for kw in keywords):
                continue
            score = get_sentiment_score(text)
            sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")]
            relevant = [s for s in sentences if any(kw in s.lower() for kw in keywords) and len(s) > 15]
            if not relevant:
                continue
            sentence = relevant[0][:150]
            if score >= 0.3 and not pro_quote:
                pro_quote = sentence
            elif score <= -0.3 and not con_quote:
                con_quote = sentence
            if pro_quote and con_quote:
                break

        if pro_quote and con_quote:
            conflicts.append({
                "aspect": aspect,
                "conflict_score": conflict_score,
                "pro_evidence": pro_quote,
                "con_evidence": con_quote,
                "positive_count": aspect_data.get("positive_count", 0),
                "negative_count": aspect_data.get("negative_count", 0),
                "insight": _conflict_insight(conflict_score, aspect)
            })

    conflicts.sort(key=lambda x: x["conflict_score"], reverse=True)
    return conflicts[:3]


def _conflict_insight(score: float, aspect: str) -> str:
    if score >= 0.70:
        return f"Highly polarizing — buyers strongly divided on {aspect}"
    elif score >= 0.50:
        return f"Moderately divided opinions on {aspect}"
    return f"Some disagreement on {aspect}"


# ── Confidence Engine ──────────────────────────────────────────────────────────

def compute_confidence(df: pd.DataFrame, top_aspects: list, audit: dict) -> dict:
    """
    Multi-factor confidence score with full explanation.
    """
    factors = {}
    total_score = 0.0

    # 1. Review count (30%)
    count = len(df)
    if count >= 500:
        count_score = 1.0
        count_label = f"very high ({count} reviews)"
    elif count >= 100:
        count_score = 0.8
        count_label = f"high ({count} reviews)"
    elif count >= 30:
        count_score = 0.6
        count_label = f"moderate ({count} reviews)"
    elif count >= 10:
        count_score = 0.35
        count_label = f"low ({count} reviews)"
    else:
        count_score = 0.1
        count_label = f"very low ({count} reviews)"

    factors["review_count"] = count_label
    total_score += count_score * 0.30

    # 2. Recency (25%)
    recent_count = audit.get("used_in_analysis", 0)
    recent_ratio = recent_count / max(count, 1)
    if recent_ratio >= 0.4:
        recency_score = 1.0
        recency_label = f"strong ({recent_count} recent reviews)"
    elif recent_ratio >= 0.2:
        recency_score = 0.7
        recency_label = f"moderate ({recent_count} recent reviews)"
    else:
        recency_score = 0.4
        recency_label = f"weak ({recent_count} recent reviews)"

    factors["recency"] = recency_label
    total_score += recency_score * 0.25

    # 3. Sentiment agreement (25%)
    agreements = [a.get("agreement_ratio", 0.5) for a in top_aspects]
    avg_agreement = np.mean(agreements) if agreements else 0.5
    agreement_pct = f"{avg_agreement*100:.0f}% consistent sentiment"
    factors["agreement"] = agreement_pct
    total_score += avg_agreement * 0.25

    # 4. Aspect coverage (20%)
    aspects_with_data = len([a for a in top_aspects if a.get("review_count", 0) >= 5])
    total_aspects = max(len(top_aspects), 1)
    coverage_ratio = aspects_with_data / total_aspects
    factors["coverage"] = f"{aspects_with_data} of {total_aspects} aspects have sufficient data"
    total_score += coverage_ratio * 0.20

    final_score = round(min(total_score, 1.0), 3)

    if final_score >= 0.80:
        level = "HIGH ✅"
    elif final_score >= 0.50:
        level = "MEDIUM ⚠️"
    elif final_score >= 0.20:
        level = "LOW ⚠️"
    else:
        level = "VERY LOW ❌"

    return {
        "score": final_score,
        "level": level,
        "reasons": factors
    }


# ── Summary Generator ──────────────────────────────────────────────────────────

def generate_summary(
    product_id: str,
    top_aspects: list,
    pros: list,
    cons: list,
    drift: dict,
    confidence: dict,
    audit: dict
) -> str:
    """
    Rule-based summary — completely grounded in extracted data.
    Zero hallucination.
    """
    parts = []

    total = audit.get("total_reviews", 0)
    verified = audit.get("verified_purchases", 0)
    parts.append(f"Based on {total} reviews ({verified} verified purchases)")

    if pros:
        top_pro = pros[0]["aspect"]
        parts.append(f"customers particularly appreciate {top_pro}")

    if cons:
        top_con = cons[0]["aspect"]
        parts.append(f"while raising consistent concerns about {top_con}")

    # Drift alerts
    declining = [k for k, v in drift.items() if v["direction"] == "declining"]
    improving = [k for k, v in drift.items() if v["direction"] == "improving"]

    if declining:
        parts.append(f"Notably, {', '.join(declining)} sentiment has declined recently")
    if improving:
        parts.append(f"however {', '.join(improving)} has been improving")

    conf_score = confidence.get("score", 0)
    if conf_score >= 0.80:
        parts.append(f"These insights carry HIGH confidence")
    elif conf_score >= 0.50:
        parts.append(f"These insights carry MEDIUM confidence")
    else:
        parts.append(f"Confidence is LOW due to limited review data")

    return ". ".join(parts) + "."
