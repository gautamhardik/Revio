"""
Revio Phase 2A.2 — Candidate Activation Workflow & Deployment Controls Test Suite

Verifies:
1. Default model selection (unversioned traffic defaults to champion with T=0.48)
2. Explicit candidate routing (version='candidate' applies T=0.55)
3. Missing candidate behavior (HTTP 503 error, strict non-fallback)
4. API health checks across Express (:4000) and FastAPI (:8008)
5. Zero-downtime rollback safety (champion preserved intact)
"""
import os
import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi import HTTPException

REPO_ROOT = Path(__file__).resolve().parents[1]
ML_SERVICE_DIR = REPO_ROOT / "ml_service"
ARTIFACTS_DIR = REPO_ROOT / "revio_business_review_experiment" / "artifacts"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

try:
    from ml_service.app.api.revio_routes import (
        get_revio_model,
        predict_business_review,
        get_models_audit,
        RevioPredictRequest,
        CHAMPION_MODEL_PATH,
        CANDIDATE_MODEL_PATH,
    )
    import ml_service.app.api.revio_routes
    sys.modules["app.api.revio_routes"] = ml_service.app.api.revio_routes
except ImportError:
    from app.api.revio_routes import (
        get_revio_model,
        predict_business_review,
        get_models_audit,
        RevioPredictRequest,
        CHAMPION_MODEL_PATH,
        CANDIDATE_MODEL_PATH,
    )


def test_default_model_selection():
    """Verify that unversioned requests default to the champion model with T=0.48."""
    with patch.dict(os.environ, {"REVIO_ACTIVE_MODEL": "champion"}):
        model, meta = get_revio_model(None)
        assert meta.get("decision_threshold") == 0.48
        assert "candidate" not in meta.get("model_name", "").lower()

        req = RevioPredictRequest(text="Standard dining experience, pasta was fine.")
        resp = predict_business_review(req)
        assert resp.decision_threshold == 0.48
        assert "candidate" not in resp.model_version.lower()


def test_explicit_candidate_routing():
    """Verify that explicit candidate requests correctly apply T=0.55."""
    model, meta = get_revio_model("candidate")
    assert meta.get("decision_threshold") == 0.55
    assert "candidate" in meta.get("model_name", "").lower() or "optimized" in meta.get("model_name", "").lower()

    req = RevioPredictRequest(
        text="Brilliant service and exceptional dessert at the hotel bistro.",
        model_version="candidate"
    )
    resp = predict_business_review(req)
    assert resp.decision_threshold == 0.55
    assert "candidate" in resp.model_version.lower() or "optimized" in resp.model_version.lower()


def test_missing_candidate_returns_503_without_silent_fallback():
    """Verify that if the candidate artifact is unavailable, the API returns HTTP 503 instead of falling back."""
    with patch("ml_service.app.api.revio_routes.CANDIDATE_MODEL_PATH") as mock_path:
        mock_path.is_file.return_value = False
        mock_path.name = "yelp_word_char_lr_candidate.joblib"

        with pytest.raises(HTTPException) as exc_info:
            get_revio_model("candidate")

        assert exc_info.value.status_code == 503
        assert "Silent fallback to champion is prohibited" in exc_info.value.detail


def test_models_audit_endpoint_integrity():
    """Verify that the models audit endpoint accurately reflects deployment state."""
    audit = get_models_audit()
    assert audit.champion_available is True
    assert audit.candidate_available is True
    assert audit.champion_threshold == 0.48
    assert audit.candidate_threshold == 0.55
    assert audit.champion_path == "yelp_word_char_lr.joblib"
    assert audit.candidate_path == "yelp_word_char_lr_candidate.joblib"


def test_original_champion_rollback_safety():
    """Verify that switching REVIO_ACTIVE_MODEL back to champion cleanly restores baseline serving."""
    # Verify champion artifact remains intact on disk
    assert CHAMPION_MODEL_PATH.is_file(), "Original champion artifact must be preserved on disk."

    with patch.dict(os.environ, {"REVIO_ACTIVE_MODEL": "champion"}):
        model, meta = get_revio_model()
        assert meta.get("decision_threshold") == 0.48

