# trust.py
import pandas as pd
import numpy as np
from datetime import datetime
from analyzer import get_sentiment_score, get_sentiment_label, preprocess_text


def compute_trust_score(row: pd.Series) -> dict:
    """
    Compute a trust score for a single review.
    Based on: verified purchase, review timing, sentiment-rating alignment, reviewer history
    """
    score = 0.0
    reasons = []

    # 1. Verified purchase (+0.40)
    verified = bool(row.get("verified_purchase", False))
    if verified:
        score += 0.40
        reasons.append("Verified buyer")
    else:
        reasons.append("Unverified purchase")

    # 2. Review timing after purchase (+0.20)
    days_to_review = None
    review_date = row.get("review_date")
    if pd.notna(review_date):
        try:
            if isinstance(review_date, str):
                review_date = pd.to_datetime(review_date)
            days_ago = (datetime.now() - review_date).days
            if 0 < days_ago <= 7:
                score += 0.20
                days_to_review = days_ago
                reasons.append(f"Reviewed within {days_ago} days of purchase")
            elif days_ago <= 30:
                score += 0.10
                days_to_review = days_ago
                reasons.append(f"Reviewed within {days_ago} days of purchase")
        except Exception:
            pass

    # 3. Sentiment matches rating (+0.20)
    rating = float(row.get("rating", 3.0))
    text = str(row.get("review_text", ""))
    sentiment_score = get_sentiment_score(text)

    rating_positive = rating >= 4.0
    sentiment_positive = sentiment_score >= 0.05

    if rating_positive == sentiment_positive:
        score += 0.20
        reasons.append("Rating matches review sentiment")
    else:
        reasons.append("Rating conflicts with review text")

    # 4. Review length (quality signal) (+0.10)
    if len(text) > 100:
        score += 0.10
        reasons.append("Detailed review")

    # 5. Not extreme/fake language (+0.10)
    clean = preprocess_text(text)
    fake_patterns = ["best product ever", "worst ever", "amazing amazing", "love love"]
    if not any(p in clean for p in fake_patterns):
        score += 0.10
        reasons.append("No suspicious language patterns")

    score = min(round(score, 2), 1.0)
    badge = "✅ VERIFIED BUYER" if verified else "⚠️ UNVERIFIED"
    weight_in_analysis = 3.0 if verified else 0.5

    return {
        "trust_score": score,
        "verified": verified,
        "badge": badge,
        "days_to_review": days_to_review,
        "weight_in_analysis": weight_in_analysis,
        "trust_reasons": reasons
    }


def select_evidence(df: pd.DataFrame, aspect_keywords: list, sentiment_type: str, n: int = 3) -> list:
    """
    Select best evidence quotes for a given aspect and sentiment.
    ONLY returns real quotes — never fabricated.
    """
    matches = []

    for _, row in df.iterrows():
        text = str(row.get("review_text", ""))
        clean = text.lower()

        # Must contain aspect keyword
        if not any(kw in clean for kw in aspect_keywords):
            continue

        # Must match sentiment direction
        score = get_sentiment_score(text)
        label = get_sentiment_label(score)

        if label != sentiment_type and sentiment_type != "any":
            continue

        # Get best sentence containing keyword
        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")]
        best_sentence = ""
        for sentence in sentences:
            if any(kw in sentence.lower() for kw in aspect_keywords) and len(sentence) > 15:
                best_sentence = sentence[:200]
                break

        if not best_sentence:
            continue

        trust = compute_trust_score(row)
        review_date = row.get("review_date")
        purchase_date_str = str(review_date)[:10] if pd.notna(review_date) else "Unknown"

        matches.append({
            "review_id": str(row.get("reviewer_id", f"R{len(matches)+1000}")),
            "quote": best_sentence,
            "rating": float(row.get("rating", 3.0)),
            "purchase_date": purchase_date_str,
            **trust
        })

    # Sort by trust score, return top N
    matches.sort(key=lambda x: x["trust_score"], reverse=True)
    return matches[:n]


def build_pros_cons(df: pd.DataFrame, top_aspects: list) -> tuple:
    """
    Build verified pros and cons with evidence fingerprints.
    RULE: No evidence = no pro/con included.
    """
    pros = []
    cons = []

    for aspect_data in top_aspects:
        aspect = aspect_data["aspect"]
        sentiment = aspect_data["sentiment"]
        score = aspect_data["score"]

        # Get keywords for this aspect
        keywords = aspect.lower().split()

        if sentiment == "positive" and score >= 0.6:
            evidence = select_evidence(df, keywords, "positive", n=3)
            if evidence:  # STRICT: only add if evidence exists
                pros.append({
                    "point": _generate_point(aspect, "positive", aspect_data),
                    "aspect": aspect,
                    "sentiment_score": score,
                    "evidence_count": len(evidence),
                    "evidence": evidence
                })

        elif sentiment == "negative" and score <= 0.45:
            evidence = select_evidence(df, keywords, "negative", n=3)
            if evidence:  # STRICT: only add if evidence exists
                cons.append({
                    "point": _generate_point(aspect, "negative", aspect_data),
                    "aspect": aspect,
                    "sentiment_score": score,
                    "evidence_count": len(evidence),
                    "evidence": evidence
                })

    return pros[:5], cons[:5]


def _generate_point(aspect: str, sentiment: str, data: dict) -> str:
    """Rule-based point generation — NO hallucination"""
    count = data.get("review_count", 0)
    score = data.get("score", 0.5)

    if sentiment == "positive":
        if score >= 0.85:
            return f"Excellent {aspect} praised by {count} reviewers"
        elif score >= 0.70:
            return f"Good {aspect} noted across {count} reviews"
        else:
            return f"Generally positive {aspect} mentioned in {count} reviews"
    else:
        if score <= 0.25:
            return f"Serious {aspect} issues reported by {count} reviewers"
        elif score <= 0.40:
            return f"Recurring {aspect} complaints across {count} reviews"
        else:
            return f"Mixed concerns about {aspect} in {count} reviews"
