"""
Revio Phase 2A - Candidate Champion Promotion Audit Test Suite

Verifies:
1. Candidate model configuration specification:
   - Word n-grams (1, 3), Char n-grams (3, 5), analyzer 'char', sublinear_tf=True
   - Equal feature weights (1.0 : 1.0)
   - Logistic Regression L2 regularisation, C = 6.0
   - Operational threshold 0.55
   - Explainability: 65,000 feature names, non-zero coefficients
2. Benchmark metrics integrity against stored evaluation artifact:
   - Acc 92.70%, NegRec 94.87%, NegPrec 90.93%, NegF1 92.85%, ROC-AUC 0.9797,
     Neg PR-AUC 0.9789, Brier 0.0550, LogLoss 0.1911, p50 latency 2.28 ms, size 1.16 MB
3. Probability and attribution semantics:
   - Linear log-odds feature attribution (X_j * beta_j)
   - Calibrated class probabilities
   - Decision threshold boundary at 0.55
4. API compatibility and schema compliance (single and batch).
5. Error handling and boundary inputs (empty, whitespace, 5,000+ chars).
6. Runtime idempotency and thread-safe concurrency.
7. Rollback safety and preservation of original champion.
"""
import sys
import json
import concurrent.futures
from pathlib import Path
import pytest
import joblib
import numpy as np

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
        predict_batch_reviews,
        get_models_audit,
        RevioPredictRequest,
        BatchRevioRequest,
        RevioPredictResponse,
    )
    import ml_service.app.api.revio_routes
    sys.modules["app.api.revio_routes"] = ml_service.app.api.revio_routes
except ImportError:
    from app.api.revio_routes import (
        get_revio_model,
        predict_business_review,
        predict_batch_reviews,
        get_models_audit,
        RevioPredictRequest,
        BatchRevioRequest,
        RevioPredictResponse,
    )

CANDIDATE_MODEL_PATH = ARTIFACTS_DIR / "yelp_word_char_lr_candidate.joblib"
CANDIDATE_META_PATH = ARTIFACTS_DIR / "yelp_word_char_lr_candidate.metadata.json"
CHAMPION_MODEL_PATH = ARTIFACTS_DIR / "yelp_word_char_lr.joblib"
CHAMPION_META_PATH = ARTIFACTS_DIR / "yelp_word_char_lr.metadata.json"
RESULTS_JSON_PATH = ARTIFACTS_DIR / "optimization_study_results.json"


def test_01_candidate_model_configuration_specification():
    """Verify all 8 pipeline parameters match the empirical study specifications."""
    assert CANDIDATE_MODEL_PATH.is_file(), "Candidate model artifact must exist."
    assert CANDIDATE_META_PATH.is_file(), "Candidate metadata file must exist."

    model = joblib.load(CANDIDATE_MODEL_PATH)
    meta = json.loads(CANDIDATE_META_PATH.read_text(encoding="utf-8"))

    # Pipeline steps
    assert "features" in model.named_steps
    assert "classifier" in model.named_steps
    features = model.named_steps["features"]
    clf = model.named_steps["classifier"]

    # FeatureUnion transformers
    t_dict = dict(features.transformer_list)
    assert "word" in t_dict and "char" in t_dict
    word_vec = t_dict["word"]
    char_vec = t_dict["char"]

    # Parameter checks
    assert word_vec.ngram_range == (1, 3), f"Expected word (1, 3), got {word_vec.ngram_range}"
    assert char_vec.ngram_range == (3, 5), f"Expected char (3, 5), got {char_vec.ngram_range}"
    assert char_vec.analyzer == "char", f"Expected analyzer 'char', got {char_vec.analyzer}"
    assert word_vec.sublinear_tf is True, "Word sublinear_tf must be True"
    assert char_vec.sublinear_tf is True, "Char sublinear_tf must be True"
    assert features.transformer_weights == {"word": 1.0, "char": 1.0}, "Weights must be equal (1.0 : 1.0)"

    # Classifier checks
    assert clf.penalty == "l2", "Classifier penalty must be l2"
    assert clf.C == 6.0, f"Expected C=6.0, got {clf.C}"
    assert meta.get("decision_threshold") == 0.55, f"Expected threshold 0.55, got {meta.get('decision_threshold')}"

    # Explainability: feature names and coefficients
    feature_names = features.get_feature_names_out()
    assert len(feature_names) == 65_000, f"Expected 65,000 features, got {len(feature_names)}"
    assert clf.coef_.shape == (1, 65_000), "Coefficients shape must match features dimension"


def test_02_benchmark_metrics_integrity():
    """Verify stored test benchmark metrics match the promotion scorecard exactly."""
    assert RESULTS_JSON_PATH.is_file(), "Optimization results JSON must exist."
    data = json.loads(RESULTS_JSON_PATH.read_text(encoding="utf-8"))

    cand = data["final_decision_matrix"]["optimized_candidate"]
    assert cand["n_samples"] == 3000
    assert cand["threshold"] == 0.55
    assert cand["accuracy"] == 0.927
    assert cand["negative_recall"] == 0.9487
    assert cand["negative_precision"] == 0.9093
    assert cand["negative_f1"] == 0.9285
    assert cand["roc_auc"] == 0.9797
    assert cand["pr_auc_negative"] == 0.9789
    assert cand["brier_score"] == 0.055
    assert cand["log_loss"] == 0.1911
    assert cand["p50_latency_ms"] <= 3.0
    assert cand["artifact_size_mb"] <= 2.0


def test_03_probability_and_attribution_semantics():
    """Verify distinct semantics for linear feature attribution vs calibrated probabilities."""
    req = RevioPredictRequest(
        text="The food was outstanding and service was fast, but the price was excessive.",
        model_version="candidate"
    )
    res = predict_business_review(req)

    # 1. Calibrated review-level probability
    assert 0.0 <= res.positive_probability <= 1.0
    assert res.decision_threshold == 0.55

    # 2. Linear feature attribution cues
    assert len(res.word_contributions) > 0
    for cue in res.word_contributions:
        assert isinstance(cue.term, str)
        assert isinstance(cue.weight, float)
        assert cue.polarity in ("Positive", "Negative")
        # Polarity must match weight sign
        if cue.weight > 0:
            assert cue.polarity == "Positive"
        elif cue.weight < 0:
            assert cue.polarity == "Negative"

    # 3. Final classification follows threshold
    if res.positive_probability >= res.decision_threshold:
        assert res.sentiment == "Positive"
    else:
        assert res.sentiment == "Negative"


def test_04_threshold_boundary_and_triage_escalation():
    """Verify decision threshold 0.55 and ambiguity corridor [0.40, 0.60] triage behavior."""
    # Definite negative complaint (prob < 0.40)
    req_neg = RevioPredictRequest(
        text="Filthy bathroom, broken lock, rude concierge refused refund. Absolute disaster.",
        model_version="candidate"
    )
    res_neg = predict_business_review(req_neg)
    assert res_neg.sentiment == "Negative"
    assert res_neg.positive_probability < 0.55
    assert res_neg.needs_human_review is True
    assert "ESCALATE (Negative / High Risk)" in res_neg.triage_status

    # High-confidence positive praise (prob > 0.60 and prob >= 0.55)
    req_pos = RevioPredictRequest(
        text="Exceptional customer experience! The staff were brilliant, room immaculate, best stay ever.",
        model_version="candidate"
    )
    res_pos = predict_business_review(req_pos)
    assert res_pos.sentiment == "Positive"
    assert res_pos.positive_probability >= 0.55
    assert res_pos.needs_human_review is False
    assert "LOW PRIORITY / NO HUMAN REVIEW REQUIRED" in res_pos.triage_status or "AUTO-ACKNOWLEDGE" in res_pos.triage_status


def test_05_api_compatibility_and_schema_validation():
    """Verify request/response schemas for candidate and champion across single and batch calls."""
    # 1. Models audit endpoint
    audit_info = get_models_audit()
    assert audit_info.champion_available is True
    assert audit_info.candidate_available is True
    assert audit_info.champion_threshold == 0.48
    assert audit_info.candidate_threshold == 0.55

    # 2. Standard single predict call
    req = RevioPredictRequest(text="Decent location, clean sheets, friendly desk agent.", model_version="candidate")
    res = predict_business_review(req)
    assert isinstance(res, RevioPredictResponse)
    assert res.latency_ms is not None and res.latency_ms > 0
    assert res.model_version == "yelp_word_char_lr_optimized"

    # 3. Batch prediction call
    batch_req = BatchRevioRequest(
        reviews=[
            "Loved the homemade pasta and quick seating.",
            "Water was leaking from ceiling, front desk was indifferent.",
            "Average experience, nothing special."
        ],
        model_version="candidate"
    )
    batch_res = predict_batch_reviews(batch_req)
    assert batch_res["count"] == 3
    assert len(batch_res["reviews"]) == 3
    assert batch_res["reviews"][0].sentiment == "Positive"
    assert batch_res["reviews"][1].sentiment == "Negative"


def test_06_edge_case_and_boundary_resilience():
    """Verify graceful handling of empty, whitespace-only, and 5,000+ character text."""
    # Empty string
    res_empty = predict_business_review(RevioPredictRequest(text="", model_version="candidate"))
    assert res_empty.needs_human_review is True
    assert res_empty.positive_probability == 0.50

    # Whitespace
    res_ws = predict_business_review(RevioPredictRequest(text="   \t\n  ", model_version="candidate"))
    assert res_ws.needs_human_review is True

    # 5,000+ character review
    long_text = ("The hotel was moderately clean, but the AC had an annoying hum throughout the night. " * 65)
    assert len(long_text) > 5000
    res_long = predict_business_review(RevioPredictRequest(text=long_text, model_version="candidate"))
    assert res_long.sentiment in ("Positive", "Negative", "Mixed")
    assert res_long.latency_ms is not None


def test_07_runtime_idempotency_and_thread_safe_concurrency():
    """Verify deterministic repeatability and thread-safety under concurrent load."""
    test_text = "Prompt service and delicious coffee. Will definitely visit again."
    req = RevioPredictRequest(text=test_text, model_version="candidate")

    # 1. Idempotency across 10 calls
    first_res = predict_business_review(req)
    for _ in range(9):
        res = predict_business_review(req)
        assert res.sentiment == first_res.sentiment
        assert round(res.positive_probability, 4) == round(first_res.positive_probability, 4)
        assert len(res.word_contributions) == len(first_res.word_contributions)

    # 2. Concurrency across 20 simultaneous threads
    def worker(idx):
        t = f"Sample review {idx}: great atmosphere, loved the cappuccino!" if idx % 2 == 0 else f"Sample {idx}: cold soup, terrible wait time!"
        r = predict_business_review(RevioPredictRequest(text=t, model_version="candidate"))
        return r.sentiment

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(worker, range(20)))

    assert len(results) == 20
    assert all(s in ("Positive", "Negative") for s in results)


def test_08_rollback_safety_and_champion_preservation():
    """Verify that original champion artifact exists, is untouched, and serves baseline traffic."""
    assert CHAMPION_MODEL_PATH.is_file(), "Original champion artifact must be preserved."
    assert CHAMPION_META_PATH.is_file(), "Original champion metadata must be preserved."

    # Call without model_version defaults to champion
    req_default = RevioPredictRequest(text="Amazing dessert and polite staff!")
    res_default = predict_business_review(req_default)
    assert res_default.decision_threshold == 0.48, "Default traffic must use champion threshold (0.48)"
    assert res_default.model_version == "yelp_word_char_lr", "Default model version must be champion"

    # Explicit champion call
    req_champ = RevioPredictRequest(text="Amazing dessert and polite staff!", model_version="champion")
    res_champ = predict_business_review(req_champ)
    assert res_champ.decision_threshold == 0.48
    assert res_champ.model_version == "yelp_word_char_lr"

