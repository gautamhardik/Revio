"""
Revio Phase 2C — Vercel Architecture & Serverless Function Test Suite
Verifies:
1. api/index.py initializes cleanly without heavy deep learning runtimes (torch, tensorflow).
2. Endpoints (/api/v1/health, /api/v1/revio/predict, /api/v1/revio/batch, /api/v1/revio/models)
   conform to Revio API contracts.
3. Candidate model default selection (T=0.55) and champion rollback (T=0.48).
4. Strict non-fallback: missing candidate raises HTTP 503.
5. Serverless bundle artifact isolation (no BERT, LSTM, or training files in api/artifacts/).
"""
import os
import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.index import app, get_revio_model, CANDIDATE_MODEL_PATH, CHAMPION_MODEL_PATH

client = TestClient(app)

def test_vercel_app_initialization_runtime_isolation():
    """Verify that api/index.py does not import torch, tensorflow, or keras."""
    assert "torch" not in sys.modules, "Production Vercel serverless function must not import PyTorch."
    assert "tensorflow" not in sys.modules, "Production Vercel serverless function must not import TensorFlow."
    assert "keras" not in sys.modules, "Production Vercel serverless function must not import Keras."
    assert app.title == "Revio Customer Review Intelligence API"


def test_vercel_health_endpoint():
    """Verify health endpoint reports correct serverless status and offline benchmark labels."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["ml_service"] is True
    assert data["models_loaded"]["logistic_regression"] is True
    assert data["models_loaded"]["lstm"] == "offline_benchmark"
    assert data["models_loaded"]["bert"] == "offline_benchmark"
    assert "active_model" in data


def test_vercel_models_audit_endpoint():
    """Verify /api/v1/revio/models reports candidate threshold 0.55 and champion threshold 0.48."""
    resp = client.get("/api/v1/revio/models")
    assert resp.status_code == 200
    data = resp.json()
    assert data["candidate_available"] is True
    assert data["champion_available"] is True
    assert data["candidate_threshold"] == 0.55
    assert data["champion_threshold"] == 0.48
    assert "yelp_word_char_lr_candidate.joblib" in data["candidate_path"]


def test_vercel_single_prediction_inference():
    """Verify single review prediction returns probability, threshold, and log-odds attribution."""
    payload = {
        "text": "The roasted sea bass and Pinot Noir were exquisite! Truly exceptional hospitality.",
        "model_version": "candidate"
    }
    resp = client.post("/api/v1/revio/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["sentiment"] == "Positive"
    assert data["positive_probability"] > 0.60
    assert data["decision_threshold"] == 0.55
    assert data["triage_status"] == "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"
    assert data["needs_human_review"] is False
    assert len(data["word_contributions"]) > 0
    assert data["word_contributions"][0]["polarity"] == "Positive"


def test_vercel_ambiguity_corridor_triage():
    """Verify reviews with 0.40 <= P <= 0.60 escalate to human review for ambiguity."""
    payload = {
        "text": "Average lunch, nothing special. The salad was fresh but soup was cold.",
        "model_version": "candidate"
    }
    resp = client.post("/api/v1/revio/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    if 0.40 <= data["positive_probability"] <= 0.60:
        assert data["triage_status"] == "ESCALATE (Ambiguity / Low Confidence)"
        assert data["needs_human_review"] is True


def test_vercel_batch_prediction_endpoint():
    """Verify /api/v1/revio/batch processes lists of reviews."""
    payload = {
        "reviews": [
            "Outstanding service and fabulous dinner!",
            "Terrible experience, waited 45 minutes and food was cold.",
            "Water heater broke over the weekend."
        ],
        "model_version": "candidate"
    }
    resp = client.post("/api/v1/revio/batch", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 3
    assert len(data["reviews"]) == 3
    assert data["reviews"][0]["sentiment"] == "Positive"
    assert data["reviews"][1]["sentiment"] == "Negative"


def test_vercel_batch_exceeding_100_rejected():
    """Verify batches exceeding 100 reviews are rejected with 400 Bad Request."""
    payload = {
        "reviews": ["Sample review"] * 101
    }
    resp = client.post("/api/v1/revio/batch", json=payload)
    assert resp.status_code == 400
    assert "exceeds maximum limit of 100" in resp.json()["detail"]


def test_vercel_domain_safeguards():
    """Verify out-of-domain billing disputes are forced to human review."""
    payload = {
        "text": "They charged an unauthorized overdraft fee and customer support refused refund.",
        "domain": "restaurant",  # Client tries to override domain
        "model_version": "candidate"
    }
    resp = client.post("/api/v1/revio/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["domain_validated"] is False
    assert data["needs_human_review"] is True
    assert "Customer Support & Billing" in data["domain"]
    assert "ESCALATE" in data["triage_status"]


def test_vercel_missing_candidate_raises_503_without_silent_fallback():
    """Verify missing candidate artifact raises 503 instead of falling back to champion."""
    with patch("api.index.CANDIDATE_MODEL_PATH", Path("non_existent_model.joblib")):
        # Clear cache for candidate to force path check
        import api.index as idx_mod
        idx_mod._cached_models.pop("candidate", None)
        with pytest.raises(Exception) as exc_info:
            get_revio_model("candidate")
        assert exc_info.value.status_code == 503
        assert "Silent fallback to champion is prohibited" in exc_info.value.detail


def test_vercel_champion_rollback_safety():
    """Verify switching REVIO_ACTIVE_MODEL to champion restores decision threshold 0.48."""
    with patch.dict(os.environ, {"REVIO_ACTIVE_MODEL": "champion"}):
        model, meta = get_revio_model()
        assert meta.get("decision_threshold") == 0.48
        resp = client.post("/api/v1/revio/predict", json={"text": "Delicious food!"})
        assert resp.status_code == 200
        assert resp.json()["decision_threshold"] == 0.48


def test_vercel_bundle_artifact_isolation():
    """Verify api/artifacts contains only candidate and champion files (no BERT, LSTM, or PyTorch)."""
    art_dir = REPO_ROOT / "api" / "artifacts"
    files = list(art_dir.iterdir())
    names = [f.name for f in files]
    
    assert "yelp_word_char_lr_candidate.joblib" in names
    assert "yelp_word_char_lr.joblib" in names
    
    # Must NOT contain heavy deep learning files
    for n in names:
        assert not n.endswith(".keras"), f"Heavy Keras file {n} found in serverless bundle!"
        assert not n.endswith(".safetensors"), f"Heavy safetensors file {n} found in serverless bundle!"
        assert not n.endswith(".npy"), f"Raw training array {n} found in serverless bundle!"
    
    total_size_bytes = sum(f.stat().st_size for f in files if f.is_file())
    total_size_mb = total_size_bytes / (1024 * 1024)
    assert total_size_mb < 5.0, f"Artifacts in api/artifacts exceed 5 MB: {total_size_mb:.2f} MB"
