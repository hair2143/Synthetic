# analyzer.py
import re
import string
import pandas as pd
import numpy as np
from collections import defaultdict
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False
    print("⚠️ spaCy model not loaded — falling back to keyword extraction")

try:
    from langdetect import detect
    LANGDETECT_AVAILABLE = True
except Exception:
    LANGDETECT_AVAILABLE = False

vader = SentimentIntensityAnalyzer()

# Electronics-aware aspect seed terms
ASPECT_SEEDS = {
    "battery life": ["battery", "charge", "charging", "power", "drain", "last", "hours"],
    "sound quality": ["sound", "audio", "bass", "treble", "volume", "noise", "music"],
    "build quality": ["build", "quality", "material", "plastic", "metal", "sturdy", "durable", "flimsy"],
    "screen display": ["screen", "display", "brightness", "resolution", "pixel", "hdr"],
    "performance speed": ["fast", "slow", "lag", "performance", "speed", "processor", "smooth"],
    "camera": ["camera", "photo", "picture", "video", "selfie", "lens"],
    "price value": ["price", "value", "expensive", "cheap", "worth", "affordable", "cost"],
    "delivery packaging": ["delivery", "shipping", "packaging", "arrived", "box", "package"],
    "customer support": ["support", "service", "refund", "return", "response", "customer"],
    "comfort fit": ["comfort", "comfortable", "fit", "wear", "ergonomic", "lightweight", "heavy"],
    "connectivity": ["bluetooth", "wifi", "connection", "pair", "connect", "signal", "wireless"],
    "design looks": ["design", "look", "style", "color", "beautiful", "ugly", "sleek"]
}

# Fintech-aware aspects (for banking app reviews)
FINTECH_ASPECT_SEEDS = {
    "transaction speed": ["transaction", "transfer", "payment", "fast", "slow", "instant"],
    "app stability": ["crash", "bug", "freeze", "glitch", "stable", "error", "app"],
    "kyc process": ["kyc", "verification", "verify", "document", "onboarding"],
    "customer support": ["support", "help", "response", "resolve", "agent", "service"],
    "security": ["secure", "security", "otp", "fraud", "safe", "pin", "lock"],
    "ui experience": ["ui", "interface", "easy", "navigate", "design", "user", "experience"],
    "charges fees": ["fee", "charge", "deduct", "hidden", "cost", "free"]
}


# ── Preprocessing ──────────────────────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[^a-z0-9\s.,!?']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def is_english(text: str) -> bool:
    if not LANGDETECT_AVAILABLE:
        return True
    try:
        return detect(text) == "en"
    except Exception:
        return True


def filter_reviews(df: pd.DataFrame) -> tuple:
    """Remove non-English, too short, suspected fake reviews"""
    original_count = len(df)

    # Length filter
    df = df[df["review_text"].str.len() > 20].copy()

    # Language filter
    df["is_english"] = df["review_text"].apply(is_english)
    non_english = (~df["is_english"]).sum()
    df = df[df["is_english"]].copy()

    # Suspected fake: extremely short + 5 stars OR all caps
    df["suspected_fake"] = (
        ((df["review_text"].str.len() < 30) & (df["rating"] == 5.0)) |
        (df["review_text"].apply(lambda x: x.isupper() and len(x) > 10))
    )

    audit = {
        "total_reviews": original_count,
        "non_english_filtered": int(non_english),
        "suspected_fake": int(df["suspected_fake"].sum()),
        "low_quality": int(original_count - len(df) - non_english),
        "used_in_analysis": int((~df["suspected_fake"]).sum()),
        "verified_purchases": int(df.get("verified_purchase", pd.Series([False]*len(df))).sum())
    }

    clean_df = df[~df["suspected_fake"]].copy()
    return clean_df, audit


# ── Aspect Extraction ──────────────────────────────────────────────────────────

def detect_category(df: pd.DataFrame) -> str:
    """Auto detect product category from review keywords"""
    all_text = " ".join(df["review_text"].head(100).tolist()).lower()

    fintech_keywords = ["transaction", "payment", "bank", "upi", "neft", "kyc", "wallet"]
    electronics_keywords = ["battery", "screen", "bluetooth", "camera", "headphone", "laptop"]

    fintech_score = sum(all_text.count(w) for w in fintech_keywords)
    electronics_score = sum(all_text.count(w) for w in electronics_keywords)

    if fintech_score > electronics_score:
        return "fintech"
    return "electronics"


def extract_aspects_spacy(texts: list) -> dict:
    """Use spaCy noun chunks for dynamic aspect extraction"""
    aspect_mentions = defaultdict(list)
    for text in texts[:500]:  # limit for speed
        doc = nlp(preprocess_text(text))
        for chunk in doc.noun_chunks:
            term = chunk.root.lemma_.lower()
            if len(term) > 3 and term not in string.punctuation:
                aspect_mentions[term].append(text)
    return aspect_mentions


def extract_aspects_keywords(texts: list, category: str = "electronics") -> dict:
    """Fallback keyword-based aspect extraction"""
    seeds = FINTECH_ASPECT_SEEDS if category == "fintech" else ASPECT_SEEDS
    aspect_mentions = defaultdict(list)

    for text in texts:
        clean = preprocess_text(text)
        for aspect, keywords in seeds.items():
            if any(kw in clean for kw in keywords):
                aspect_mentions[aspect].append(text)

    return aspect_mentions


def extract_aspects(df: pd.DataFrame) -> tuple:
    """Main aspect extraction — spaCy first, keyword fallback"""
    category = detect_category(df)
    texts = df["review_text"].tolist()

    if SPACY_AVAILABLE:
        raw_aspects = extract_aspects_spacy(texts)
        # Merge with seed aspects
        seed_aspects = extract_aspects_keywords(texts, category)
        for k, v in seed_aspects.items():
            raw_aspects[k].extend(v)
    else:
        raw_aspects = extract_aspects_keywords(texts, category)

    # Filter: only aspects with 3+ mentions
    filtered = {k: v for k, v in raw_aspects.items() if len(v) >= 3}
    return filtered, category


# ── Sentiment Analysis ─────────────────────────────────────────────────────────

def get_sentiment_score(text: str) -> float:
    """Returns compound VADER score (-1 to 1)"""
    scores = vader.polarity_scores(preprocess_text(text))
    return scores["compound"]


def get_sentiment_label(score: float) -> str:
    if score >= 0.05:
        return "positive"
    elif score <= -0.05:
        return "negative"
    return "neutral"


def analyze_aspect_sentiment(aspect_texts: list, weights: list = None) -> dict:
    """Compute weighted sentiment for an aspect"""
    if not aspect_texts:
        return {"sentiment": "neutral", "score": 0.5, "review_count": 0}

    scores = [get_sentiment_score(t) for t in aspect_texts]

    if weights and len(weights) == len(scores):
        weighted_score = np.average(scores, weights=weights)
    else:
        weighted_score = np.mean(scores)

    # Normalize from -1,1 to 0,1
    normalized = (weighted_score + 1) / 2

    positive_count = sum(1 for s in scores if s >= 0.05)
    negative_count = sum(1 for s in scores if s <= -0.05)
    agreement = max(positive_count, negative_count) / len(scores) if scores else 0

    return {
        "sentiment": get_sentiment_label(weighted_score),
        "score": round(normalized, 3),
        "raw_score": round(weighted_score, 3),
        "review_count": len(aspect_texts),
        "positive_count": positive_count,
        "negative_count": negative_count,
        "agreement_ratio": round(agreement, 3)
    }


def get_top_aspects(df: pd.DataFrame, top_n: int = 8) -> list:
    """Return top N aspects with sentiment"""
    aspect_mentions, category = extract_aspects(df)

    results = []
    for aspect, texts in aspect_mentions.items():
        sentiment_data = analyze_aspect_sentiment(texts)
        results.append({
            "aspect": aspect,
            **sentiment_data,
            "impact": _compute_impact(sentiment_data)
        })

    # Sort by review_count descending
    results.sort(key=lambda x: x["review_count"], reverse=True)
    return results[:top_n], category


def _compute_impact(sentiment_data: dict) -> str:
    """How much does this aspect impact overall perception"""
    count = sentiment_data.get("review_count", 0)
    if count >= 100:
        return "HIGH"
    elif count >= 30:
        return "MEDIUM"
    return "LOW"
