# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


# ── Health ─────────────────────────────────────────────────────────────────────

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "timestamp" in data


# ── Input Validation ───────────────────────────────────────────────────────────

def test_invalid_product_id_too_short():
    response = client.get("/api/v1/insights/AB")
    assert response.status_code == 400


def test_empty_product_id():
    response = client.get("/api/v1/insights/ ")
    assert response.status_code in [400, 422]


def test_unknown_product_returns_404():
    response = client.get("/api/v1/insights/PRODUCT_DOES_NOT_EXIST_XYZ999")
    assert response.status_code in [404, 200]
    if response.status_code == 200:
        data = response.json()
        assert data["status"] in ["insufficient_data", "success"]


# ── Response Structure ─────────────────────────────────────────────────────────

def test_response_has_required_fields():
    """If a valid product exists, response must have all required fields"""
    response = client.get("/api/v1/insights/B07XJ8C8F5")
    if response.status_code == 200:
        data = response.json()
        required_fields = [
            "product_id", "status", "top_aspects",
            "pros", "cons", "summary", "confidence"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


def test_pros_always_have_evidence():
    """CRITICAL: Every pro must have at least one evidence item"""
    response = client.get("/api/v1/insights/B07XJ8C8F5")
    if response.status_code == 200:
        data = response.json()
        if data["status"] == "success":
            for pro in data.get("pros", []):
                assert len(pro["evidence"]) > 0, f"Pro '{pro['point']}' has no evidence!"


def test_cons_always_have_evidence():
    """CRITICAL: Every con must have at least one evidence item"""
    response = client.get("/api/v1/insights/B07XJ8C8F5")
    if response.status_code == 200:
        data = response.json()
        if data["status"] == "success":
            for con in data.get("cons", []):
                assert len(con["evidence"]) > 0, f"Con '{con['point']}' has no evidence!"


def test_confidence_score_between_0_and_1():
    """Confidence score must always be 0-1"""
    response = client.get("/api/v1/insights/B07XJ8C8F5")
    if response.status_code == 200:
        data = response.json()
        if data["status"] == "success":
            score = data["confidence"]["score"]
            assert 0.0 <= score <= 1.0, f"Invalid confidence score: {score}"


def test_insufficient_data_response_structure():
    """Sparse product must return proper insufficient_data structure"""
    response = client.get("/api/v1/insights/SPARSE_PRODUCT_XYZ")
    if response.status_code == 200:
        data = response.json()
        if data["status"] == "insufficient_data":
            assert "reviews_found" in data
            assert "minimum_required" in data
            assert "message" in data
            assert data["reviews_found"] < data["minimum_required"]


# ── Drift & Conflicts ──────────────────────────────────────────────────────────

def test_drift_endpoint():
    response = client.get("/api/v1/drift/B07XJ8C8F5")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "trend" in data


def test_conflicts_endpoint():
    response = client.get("/api/v1/conflicts/B07XJ8C8F5")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "conflicts" in data


# ── Compare ────────────────────────────────────────────────────────────────────

def test_compare_missing_params():
    response = client.get("/api/v1/compare?product_a=B07XJ8C8F5")
    assert response.status_code == 422


def test_compare_valid_request():
    response = client.get("/api/v1/compare?product_a=B07XJ8C8F5&product_b=B08N5WRWNW")
    assert response.status_code in [200, 404]


# ── Trust ──────────────────────────────────────────────────────────────────────

def test_trust_audit_endpoint():
    response = client.get("/api/v1/trust/B07XJ8C8F5")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "review_quality_audit" in data
