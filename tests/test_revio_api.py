"""
Integration and regression tests for Revio Business Review API and Pipeline.
Includes synthetic classifier tests to ensure test coverage does not depend on remote network calls.
"""
import sys
from pathlib import Path
import pytest
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Ensure ml_service is discoverable both at runtime and by static analyzers
ML_SERVICE_DIR = Path(__file__).resolve().parents[1] / "ml_service"
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

def test_synthetic_business_review_classifier():
    texts = [
        "Terrible service, food was cold and waiter was rude",
        "Horrible experience, never coming back to this store",
        "Worst customer support ever, broken item received",
        "Amazing experience, friendly staff and fast delivery",
        "Delicious food and quick service, loved it",
        "Exceptional quality and great customer care"
    ]
    labels = [0, 0, 0, 1, 1, 1]
    
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression())
    ])
    pipe.fit(texts, labels)
    
    test_neg = ["The waiter was rude and food cold"]
    test_pos = ["Loved the delicious food and fast delivery"]
    
    prob_neg = pipe.predict_proba(test_neg)[0][1]
    prob_pos = pipe.predict_proba(test_pos)[0][1]
    
    assert prob_neg < 0.5
    assert prob_pos > 0.5

def test_triage_decision_thresholding():
    threshold = 0.48
    min_neg_prec = 0.85
    
    # Negative test case
    prob = 0.15
    label = "Positive" if prob >= threshold else "Negative"
    assert label == "Negative"
    
    # Triage flag logic
    triage_action = "ESCALATE (Negative Review / Risk)" if label == "Negative" else "AUTO-ACKNOWLEDGE"
    assert "ESCALATE" in triage_action

def test_word_level_contributions():
    vec = TfidfVectorizer()
    clf = LogisticRegression()
    texts = ["bad cold food", "good friendly staff"]
    y = [0, 1]
    X = vec.fit_transform(texts)
    clf.fit(X, y)
    
    test_text = "bad cold food"
    X_test = vec.transform([test_text])
    feature_names = vec.get_feature_names_out()
    coef = clf.coef_[0]
    
    contributions = []
    for idx in X_test.nonzero()[1]:
        word = feature_names[idx]
        weight = float(X_test[0, idx] * coef[idx])
        contributions.append((word, weight))
        
    neg_contribs = [c for c in contributions if c[1] < 0]
    assert len(neg_contribs) > 0
def test_revio_prediction_service():
    import sys
    from pathlib import Path
    ml_svc = str(Path(__file__).resolve().parents[1] / "ml_service")
    if ml_svc not in sys.path:
        sys.path.insert(0, ml_svc)
    try:
        from ml_service.app.api.revio_routes import predict_business_review, RevioPredictRequest
        import ml_service.app.api.revio_routes
        sys.modules["app.api.revio_routes"] = ml_service.app.api.revio_routes
    except (ImportError, ModuleNotFoundError):
        from app.api.revio_routes import predict_business_review, RevioPredictRequest
    
    # Test negative complaint
    req_neg = RevioPredictRequest(text="The room was dirty and the reception was completely unresponsive.")
    res_neg = predict_business_review(req_neg)
    assert res_neg.sentiment == "Negative"
    assert res_neg.needs_human_review is True
    assert "ESCALATE" in res_neg.triage_status
    assert len(res_neg.word_contributions) > 0
    
    # Test positive praise
    req_pos = RevioPredictRequest(text="Exceptional customer service, seamless check-in and beautiful room!")
    res_pos = predict_business_review(req_pos)
    assert res_pos.sentiment == "Positive"
    assert res_pos.positive_probability > 0.6
