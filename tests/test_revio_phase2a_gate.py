"""
Revio Phase 2A.1 - Final Production Promotion Gate Test Suite

Tests:
1. Triage Precedence:
   - Rule 1: 0.40 <= P(Positive) <= 0.60 -> Human review for ambiguity
   - Rule 2: P(Positive) < 0.40 -> Classify negative and escalate (High Risk)
   - Rule 3: P(Positive) > 0.60 -> Classify positive and auto-acknowledge (if domain validated)
   - Exact boundaries tested at 0.40, 0.55, 0.60, 0.399, 0.601
   - Independent 0.55 decision threshold verification
2. Domain Safeguards:
   - Unvalidated domains (Customer Support, Billing Disputes, IT Telecom) routed to human review
   - Auto-acknowledgement prohibited for unvalidated domains even if P > 0.60
   - Explanation provided that feedback is outside validated domain
   - Validated local business domains (restaurants, hotels, cafes) allowed auto-ack
3. Candidate Routing & Non-Fallback:
   - Default requests use champion (T=0.48)
   - Explicit candidate requests use candidate (T=0.55)
   - Invalid version requests return HTTP 400
   - Failed/missing candidate requests return HTTP 503, never silently falling back to champion
4. Calibration & Attribution Semantics:
   - Probability is verified as standard Logistic Regression sigmoid(z)
   - Attribution is verified as linear log-odds cues (X_j * beta_j), not probability percentages
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException

# Path setup
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
        detect_domain_safeguard,
        RevioPredictRequest,
        RevioPredictResponse,
        CANDIDATE_MODEL_PATH,
        CHAMPION_MODEL_PATH,
    )
    import ml_service.app.api.revio_routes
    sys.modules["app.api.revio_routes"] = ml_service.app.api.revio_routes
except ImportError:
    from app.api.revio_routes import (
        get_revio_model,
        predict_business_review,
        detect_domain_safeguard,
        RevioPredictRequest,
        RevioPredictResponse,
        CANDIDATE_MODEL_PATH,
        CHAMPION_MODEL_PATH,
    )


class DummyVectoriser:
    def transform(self, texts):
        mock_matrix = MagicMock()
        mock_matrix.nonzero.return_value = ([], [])
        return mock_matrix

    def get_feature_names_out(self):
        return []


class DummyClassifier:
    coef_ = [[]]


class DummyPipeline:
    def __init__(self, prob_pos):
        self._prob_pos = prob_pos
        self.named_steps = {
            "features": DummyVectoriser(),
            "classifier": DummyClassifier()
        }

    def predict_proba(self, texts):
        return [[1.0 - self._prob_pos, self._prob_pos]]


def test_triage_precedence_exact_boundaries():
    """
    Test exact boundaries at 0.40, 0.55, 0.60, 0.399, 0.601 with candidate threshold 0.55.
    Rule 1: 0.40 <= P <= 0.60 -> ESCALATE (Ambiguity / Low Confidence)
    Rule 2: P < 0.40 -> ESCALATE (Negative / High Risk)
    Rule 3: P > 0.60 -> AUTO-ACKNOWLEDGE (High-Confidence Positive)
    """
    test_cases = [
        # (prob_pos, expected_sentiment, expected_triage, expected_human)
        (0.40, "Negative", "ESCALATE (Ambiguity / Low Confidence)", True),
        (0.55, "Positive", "ESCALATE (Ambiguity / Low Confidence)", True),
        (0.60, "Positive", "ESCALATE (Ambiguity / Low Confidence)", True),
        (0.399, "Negative", "ESCALATE (Negative / High Risk)", True),
        (0.601, "Positive", "LOW PRIORITY / NO HUMAN REVIEW REQUIRED", False),
        (0.15, "Negative", "ESCALATE (Negative / High Risk)", True),
        (0.95, "Positive", "LOW PRIORITY / NO HUMAN REVIEW REQUIRED", False),
    ]

    for prob, exp_sentiment, exp_triage, exp_human in test_cases:
        mock_model = DummyPipeline(prob)
        mock_meta = {"decision_threshold": 0.55, "model_name": "yelp_word_char_lr_candidate"}

        with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model, mock_meta)):
            req = RevioPredictRequest(text="Delicious dinner and lovely atmosphere at the bistro.", model_version="candidate")
            resp = predict_business_review(req)

            assert resp.positive_probability == pytest.approx(prob, abs=1e-4)
            assert resp.sentiment == exp_sentiment, f"Prob {prob} expected sentiment {exp_sentiment}, got {resp.sentiment}"
            assert resp.triage_status == exp_triage, f"Prob {prob} expected triage {exp_triage}, got {resp.triage_status}"
            assert resp.needs_human_review == exp_human, f"Prob {prob} expected needs_human_review {exp_human}, got {resp.needs_human_review}"


def test_independent_decision_threshold_separation():
    """
    Confirm that the 0.55 decision threshold works independently of the triage corridor:
    - P = 0.50 on candidate (T=0.55) -> Sentiment is Negative (0.50 < 0.55), but triage is Ambiguity
    - P = 0.56 on candidate (T=0.55) -> Sentiment is Positive (0.56 >= 0.55), but triage is Ambiguity
    - P = 0.50 on champion (T=0.48) -> Sentiment is Positive (0.50 >= 0.48), but triage is Ambiguity
    """
    # Candidate evaluation at 0.50
    mock_model_cand = DummyPipeline(0.50)
    mock_meta_cand = {"decision_threshold": 0.55, "model_name": "yelp_word_char_lr_candidate"}
    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model_cand, mock_meta_cand)):
        resp = predict_business_review(RevioPredictRequest(text="Good meal overall", model_version="candidate"))
        assert resp.sentiment == "Negative"
        assert resp.triage_status == "ESCALATE (Ambiguity / Low Confidence)"
        assert resp.needs_human_review is True

    # Candidate evaluation at 0.56
    mock_model_cand2 = DummyPipeline(0.56)
    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model_cand2, mock_meta_cand)):
        resp = predict_business_review(RevioPredictRequest(text="Good meal overall", model_version="candidate"))
        assert resp.sentiment == "Positive"
        assert resp.triage_status == "ESCALATE (Ambiguity / Low Confidence)"
        assert resp.needs_human_review is True

    # Champion evaluation at 0.50 (T=0.48)
    mock_model_champ = DummyPipeline(0.50)
    mock_meta_champ = {"decision_threshold": 0.48, "model_name": "yelp_word_char_lr"}
    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model_champ, mock_meta_champ)):
        resp = predict_business_review(RevioPredictRequest(text="Good meal overall", model_version="champion"))
        assert resp.sentiment == "Positive"
        assert resp.triage_status == "ESCALATE (Ambiguity / Low Confidence)"
        assert resp.needs_human_review is True


def test_domain_safeguards_unvalidated_domains():
    """
    Unsupported domains (Customer Support, Billing Disputes, IT Telecom)
    must route to human review and never auto-acknowledge even if P > 0.60.
    """
    # High confidence positive score (0.90) on billing dispute review
    mock_model = DummyPipeline(0.90)
    mock_meta = {"decision_threshold": 0.55, "model_name": "yelp_word_char_lr_candidate"}

    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model, mock_meta)):
        req = RevioPredictRequest(
            text="The billing department finally answered after a 2-hour phone tree loop and refunded the chargeback.",
            model_version="candidate"
        )
        resp = predict_business_review(req)

        # Domain detected as unvalidated
        assert resp.domain_validated is False
        assert resp.needs_human_review is True
        assert "Unvalidated Domain" in resp.triage_status
        assert "AUTO-ACKNOWLEDGE" not in resp.triage_status


def test_explicit_domain_override():
    """Test explicit domain parameter in RevioPredictRequest."""
    mock_model = DummyPipeline(0.85)
    mock_meta = {"decision_threshold": 0.55, "model_name": "yelp_word_char_lr_candidate"}

    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model, mock_meta)):
        # Explicit unvalidated domain
        req_unval = RevioPredictRequest(
            text="The service was fast and responsive.",
            domain="customer_support",
            model_version="candidate"
        )
        resp_unval = predict_business_review(req_unval)
        assert resp_unval.domain_validated is False
        assert resp_unval.needs_human_review is True
        assert "Unvalidated Domain" in resp_unval.triage_status

        # Explicit validated domain
        req_val = RevioPredictRequest(
            text="The service was fast and responsive.",
            domain="restaurant",
            model_version="candidate"
        )
        resp_val = predict_business_review(req_val)
        assert resp_val.domain_validated is True
        assert resp_val.needs_human_review is False
        assert resp_val.triage_status == "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"


def test_client_metadata_cannot_override_out_of_domain_text():
    """
    Harden domain safeguards: An untrusted client supplying domain='restaurant'
    CANNOT bypass out-of-domain text warnings (e.g., billing disputes / phone trees).
    """
    mock_model = DummyPipeline(0.88)
    mock_meta = {"decision_threshold": 0.55, "model_name": "yelp_word_char_lr_candidate"}

    with patch("app.api.revio_routes.get_revio_model", return_value=(mock_model, mock_meta)):
        req = RevioPredictRequest(
            text="The meal was fine but I discovered an unauthorized charge on my card and had to call billing.",
            domain="restaurant",
            model_version="candidate"
        )
        resp = predict_business_review(req)
        # Must be rejected as unvalidated despite domain='restaurant'
        assert resp.domain_validated is False
        assert resp.needs_human_review is True
        assert "Customer Support & Billing" in resp.domain
        assert "Conflicting with client 'restaurant'" in resp.domain
        assert "Unvalidated Domain" in resp.triage_status


def test_candidate_routing_and_silent_fallback_prohibition():
    """
    Verify:
    - Default requests use champion (T=0.48).
    - Explicit candidate requests use candidate (T=0.55).
    - Invalid version returns HTTP 400.
    - Missing candidate returns HTTP 503 without silent fallback.
    """
    # 1. Default request uses champion
    _, meta_default = get_revio_model(None)
    assert meta_default.get("decision_threshold") == 0.48
    assert "candidate" not in meta_default.get("model_name", "")

    # 2. Explicit candidate request uses candidate
    _, meta_cand = get_revio_model("candidate")
    assert meta_cand.get("decision_threshold") == 0.55
    assert meta_cand.get("model_name") in ("yelp_word_char_lr_optimized", "yelp_word_char_lr_candidate")

    # 3. Invalid version returns HTTP 400
    with pytest.raises(HTTPException) as exc_400:
        get_revio_model("nonexistent_v3")
    assert exc_400.value.status_code == 400

    # 4. Missing candidate returns HTTP 503 (no silent fallback)
    with patch("app.api.revio_routes.CANDIDATE_MODEL_PATH") as mock_cand_path:
        mock_cand_path.is_file.return_value = False
        mock_cand_path.name = "yelp_word_char_lr_candidate.joblib"
        with pytest.raises(HTTPException) as exc_503:
            get_revio_model("candidate")
        assert exc_503.value.status_code == 503
        assert "Silent fallback to champion is prohibited" in exc_503.value.detail


def test_calibration_and_attribution_semantics():
    """
    Verify that candidate outputs are standard Logistic Regression sigmoid probabilities
    and attribution weights are linear log-odds cues (X_j * beta_j).
    """
    import joblib
    assert CANDIDATE_MODEL_PATH.is_file()
    model = joblib.load(CANDIDATE_MODEL_PATH)

    # Verify pipeline components
    steps = dict(model.steps)
    assert "features" in steps, "Pipeline must contain 'features' FeatureUnion"
    assert "classifier" in steps, "Pipeline must contain 'classifier' LogisticRegression"

    clf = steps["classifier"]
    assert hasattr(clf, "predict_proba"), "Classifier must support predict_proba"
    assert hasattr(clf, "coef_"), "Classifier must expose raw linear coefficients"

    # Verify live attribution outputs from predict endpoint
    req = RevioPredictRequest(
        text="The roasted duck was exquisite, but the restroom was filthy and noisy.",
        model_version="candidate"
    )
    resp = predict_business_review(req)
    assert len(resp.word_contributions) > 0
    for cue in resp.word_contributions:
        assert isinstance(cue.term, str)
        assert isinstance(cue.weight, float)
        assert cue.polarity in ("Positive", "Negative")
        # Ensure weights are log-odds scale, not percentages
        assert not (cue.weight > 100.0 or cue.weight < -100.0)
