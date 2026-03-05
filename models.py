# models.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any
from datetime import datetime


class EvidenceItem(BaseModel):
    review_id: str
    quote: str
    rating: float
    purchase_date: str
    trust_score: float
    verified: bool
    badge: str
    days_to_review: Optional[int] = None
    weight_in_analysis: float
    trust_reasons: List[str]


class ProConItem(BaseModel):
    point: str
    aspect: str
    sentiment_score: float
    evidence_count: int
    evidence: List[EvidenceItem]


class AspectItem(BaseModel):
    aspect: str
    sentiment: str
    score: float
    review_count: int
    positive_count: int
    negative_count: int
    agreement_ratio: float
    impact: str


class DriftItem(BaseModel):
    recent_score: float
    historical_score: float
    delta: float
    direction: str
    alert: str
    recent_review_count: int
    historical_review_count: int


class ConflictItem(BaseModel):
    aspect: str
    conflict_score: float
    pro_evidence: str
    con_evidence: str
    positive_count: int
    negative_count: int
    insight: str


class ConfidenceDetail(BaseModel):
    score: float
    level: str
    reasons: dict


class ReviewAudit(BaseModel):
    total_reviews: int
    non_english_filtered: int
    suspected_fake: int
    low_quality: int
    used_in_analysis: int
    verified_purchases: int
    audit_confidence: str


class DataSources(BaseModel):
    recent_csv: str
    historical_db: str
    total: int
    csv_weight: str
    db_weight: str


class ProductMeta(BaseModel):
    category: str
    detected_from: str


class InsightsResponse(BaseModel):
    product_id: str
    status: str
    generated_at: str
    product_meta: ProductMeta
    data_sources: DataSources
    top_aspects: List[AspectItem]
    pros: List[ProConItem]
    cons: List[ProConItem]
    conflicts: List[ConflictItem]
    trend: dict
    confidence: ConfidenceDetail
    review_quality_audit: ReviewAudit
    summary: str
    synthetix_qa_badge: str
    cache_status: Optional[str] = "miss"


class InsufficientDataResponse(BaseModel):
    product_id: str
    status: str = "insufficient_data"
    reviews_found: int
    minimum_required: int
    message: str
    partial_insights: Optional[dict] = None


class CompareResponse(BaseModel):
    product_a: str
    product_b: str
    comparison: dict
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    db_connected: bool
    csv_loaded: bool
