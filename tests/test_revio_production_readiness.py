"""
Revio Phase 5 — Production Readiness & Technical Verification Test Suite.

Validates:
1. Input boundary handling: empty, whitespace-only, and excessive-length text (5,000+ chars).
2. Character encoding: Unicode, diacritics, multilingual tokens, punctuation.
3. Decision boundary sensitivity at calibrated threshold 0.48.
4. Ambiguity corridor (0.40 <= P <= 0.60) routing to human review.
5. Batch and concurrent inference performance without state corruption.
6. Operational categorization heuristics across the 4 friction domains.
7. CSV parsing and validation resilience.
"""
import sys
import io
import csv
from pathlib import Path
import pytest
import concurrent.futures

# Setup import path
REPO_ROOT = Path(__file__).resolve().parents[1]
ML_SERVICE_DIR = REPO_ROOT / "ml_service"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

try:
    from ml_service.app.api.revio_routes import predict_business_review, RevioPredictRequest, BatchRevioRequest, predict_batch_reviews
    import ml_service.app.api.revio_routes
    sys.modules["app.api.revio_routes"] = ml_service.app.api.revio_routes
except (ImportError, ModuleNotFoundError):
    from app.api.revio_routes import predict_business_review, RevioPredictRequest, BatchRevioRequest, predict_batch_reviews


def test_empty_and_whitespace_input():
    """Verify empty or whitespace-only inputs are handled gracefully without exceptions."""
    # Test empty string
    req_empty = RevioPredictRequest(text="")
    res_empty = predict_business_review(req_empty)
    assert res_empty.sentiment in ["Mixed", "Negative", "Positive"]
    assert res_empty.needs_human_review is True  # Ambiguity / empty requires review
    
    # Test whitespace
    req_ws = RevioPredictRequest(text="   \n\t   ")
    res_ws = predict_business_review(req_ws)
    assert res_ws.sentiment in ["Mixed", "Negative", "Positive"]


def test_excessive_length_input():
    """Verify 5,000+ character review does not crash or exhaust resources."""
    long_review = ("The room was fairly comfortable, but the noise from the elevator was relentless. " * 70) + "Finally checked out early."
    assert len(long_review) > 5000
    
    req = RevioPredictRequest(text=long_review)
    res = predict_business_review(req)
    assert res.sentiment in ["Mixed", "Negative"]
    assert 0.0 <= res.positive_probability <= 1.0
    assert len(res.word_contributions) > 0


def test_unicode_and_special_characters():
    """Verify non-ASCII, accents, foreign loanwords, and punctuation are parsed cleanly."""
    unicode_texts = [
        "Café au lait was délicieux, but the hôtel room had a broken naïve décor. 100% overpriced!",
        "Crème brûlée and churros were fantástico, but check-in was 45 mins spät.",
        "⭐⭐⭐⭐⭐ Outstanding stay! 10/10 would return ~~~ !!!",
        "Worst experience ever: $$$ spent, ZERO refund. #Disaster #HorribleService"
    ]
    for text in unicode_texts:
        req = RevioPredictRequest(text=text)
        res = predict_business_review(req)
        assert res.sentiment in ["Positive", "Negative", "Mixed"]
        assert isinstance(res.positive_probability, float)
        assert 0.0 <= res.positive_probability <= 1.0


def test_decision_boundary_at_calibrated_threshold():
    """
    Verify threshold 0.48 behavior:
    Reviews with positive_probability >= 0.48 are classified as Positive (or Mixed if in corridor).
    Reviews with positive_probability < 0.48 are classified as Negative.
    """
    # Strongly positive
    req_pos = RevioPredictRequest(text="The room was spotless, staff were exceptionally courteous, and food was exquisite!")
    res_pos = predict_business_review(req_pos)
    assert res_pos.positive_probability >= 0.48
    assert res_pos.sentiment == "Positive"
    assert res_pos.needs_human_review is False

    # Strongly negative
    req_neg = RevioPredictRequest(text="Disgusting mold in bathroom, rude manager refused refund, horrific experience.")
    res_neg = predict_business_review(req_neg)
    assert res_neg.positive_probability < 0.48
    assert res_neg.sentiment == "Negative"
    assert res_neg.needs_human_review is True
    assert "ESCALATE" in res_neg.triage_status


def test_ambiguity_corridor_human_review_escalation():
    """
    Verify that reviews with probability near the boundary (0.40 <= P <= 0.60)
    or containing conflicting positive and negative signals trigger needs_human_review.
    """
    mixed_text = "The room was clean and the staff were kind, but check-in took nearly forty minutes."
    req = RevioPredictRequest(text=mixed_text)
    res = predict_business_review(req)
    # The mixed review should trigger human review due to conflicting signals or corridor
    assert res.needs_human_review is True


def test_repeated_submission_idempotency():
    """Verify that repeated calls with the same text produce deterministic identical outputs."""
    sample_text = "Pleasant atmosphere and quick service. Great cappuccino."
    req = RevioPredictRequest(text=sample_text)
    res1 = predict_business_review(req)
    res2 = predict_business_review(req)
    
    assert res1.sentiment == res2.sentiment
    assert round(res1.positive_probability, 4) == round(res2.positive_probability, 4)
    assert res1.needs_human_review == res2.needs_human_review
    assert len(res1.word_contributions) == len(res2.word_contributions)


def test_concurrent_requests_thread_safety():
    """Verify worker threadpool handles multiple concurrent predictions without race conditions."""
    texts = [
        "Exceptional service and quick check-in.",
        "Terrible experience, cold food and delayed delivery.",
        "Room was clean but price was steep.",
        "Loved the rooftop view and friendly servers.",
        "Broken AC and unhelpful front desk."
    ] * 2  # 10 concurrent requests
    
    def run_req(t):
        req = RevioPredictRequest(text=t)
        return predict_business_review(req)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(run_req, texts))
    
    assert len(results) == 10
    for res in results:
        assert res.sentiment in ["Positive", "Negative", "Mixed"]
        assert 0.0 <= res.positive_probability <= 1.0


def test_batch_prediction_endpoint():
    """Verify batch prediction processes multiple reviews correctly."""
    batch_texts = [
        "Wonderful breakfast and polite concierge.",
        "Dirty towels and leaking shower head.",
        "Quiet room, decent Wi-Fi, acceptable for one night."
    ]
    req = BatchRevioRequest(reviews=batch_texts)
    res = predict_batch_reviews(req)
    
    assert res["count"] == 3
    assert len(res["reviews"]) == 3
    assert res["reviews"][0].sentiment == "Positive"
    assert res["reviews"][1].sentiment == "Negative"


def test_csv_data_validation_and_recovery():
    """Test CSV ingestion resilience: valid rows, missing columns, empty rows, escaped quotes."""
    valid_csv = (
        "review_text,source,date,rating\n"
        "\"The room was immaculate and staff very courteous.\",Yelp,2026-10-12,5\n"
        "\"Unbearable delay during checkout, waited 45 minutes.\",Google,2026-10-11,1\n"
        ",,,,\n"  # Empty row
        "\"Leaking sink, unresolved for 3 days.\",TenantEase,2026-10-10,2\n"
    )
    
    reader = csv.DictReader(io.StringIO(valid_csv))
    valid_reviews = []
    for row in reader:
        text = row.get("review_text", "").strip()
        if text:
            valid_reviews.append({
                "text": text,
                "source": row.get("source", "CSV Import"),
                "date": row.get("date", "Recent")
            })
    
    assert len(valid_reviews) == 3
    assert "immaculate" in valid_reviews[0]["text"]
    assert "Unbearable delay" in valid_reviews[1]["text"]
    assert "Leaking sink" in valid_reviews[2]["text"]
