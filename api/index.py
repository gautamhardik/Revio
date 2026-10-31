"""
Revio — Vercel Serverless Intelligence Engine (FastAPI Entry Point)
Consolidated production deployment entry point for Vercel Serverless Functions.
Provides high-performance, stateless inference for Revio customer feedback intelligence.
"""
import os
import sys
import re
import time
import json
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

# ---------------------------------------------------------------------------
# 1. Directory and Model Artifact Resolution
# ---------------------------------------------------------------------------
API_DIR = Path(__file__).resolve().parent
LOCAL_ARTIFACTS_DIR = API_DIR / "artifacts"
REPO_ROOT = API_DIR.parent
EXPERIMENT_ARTIFACTS_DIR = REPO_ROOT / "revio_business_review_experiment" / "artifacts"

def resolve_artifact_path(filename: str) -> Path:
    """Locate artifact either in api/artifacts or fallback to repo experiment dir."""
    local_p = LOCAL_ARTIFACTS_DIR / filename
    if local_p.is_file():
        return local_p
    exp_p = EXPERIMENT_ARTIFACTS_DIR / filename
    if exp_p.is_file():
        return exp_p
    return local_p  # Return intended path for diagnostic error reporting

CANDIDATE_MODEL_PATH = resolve_artifact_path("yelp_word_char_lr_candidate.joblib")
CANDIDATE_META_PATH = resolve_artifact_path("yelp_word_char_lr_candidate.metadata.json")
CHAMPION_MODEL_PATH = resolve_artifact_path("yelp_word_char_lr.joblib")
CHAMPION_META_PATH = resolve_artifact_path("yelp_word_char_lr.metadata.json")

# In-memory singletons to reuse models and feature names across warm serverless invocations
_cached_models: Dict[str, Any] = {}
_cached_metas: Dict[str, Any] = {}
_cached_features: Dict[str, Any] = {}

# ---------------------------------------------------------------------------
# 2. Domain Shift Safeguards & Validation Constants
# ---------------------------------------------------------------------------
VALIDATED_DOMAINS = {
    "restaurant", "restaurants", "dining", "food", "cafe", "cafes", "bistro", "bar", "bakery",
    "hotel", "hotels", "hospitality", "stay", "lodging", "motel", "resort",
    "travel", "facilities", "local_service", "local_business", "general_local", "general"
}

UNVALIDATED_DOMAIN_PATTERNS = [
    "billing dispute", "unauthorized charge", "unauthorized fee", "hidden charge",
    "chargeback", "overdraft fee", "recurring charge", "auto-renewal", "cancellation fee",
    "fraud alert", "wire transfer", "dispute transaction", "billing department",
    "phone tree", "ivr loop", "support ticket", "ticket number", "unresolved ticket",
    "representative hung up", "customer support agent", "tier 2 support", "customer care rep",
    "automated phone system", "cancel subscription", "hold time was 4", "on hold for 2 hours",
    "router firmware", "broadband outage", "account locked", "password reset", "api key",
    "software bug", "server error", "api downtime", "firmware update", "sdk crash",
    "database timeout", "sim card", "data cap", "roaming charges", "lost in transit", "rma number"
]

def detect_domain_safeguard(text: str, explicit_domain: Optional[str] = None) -> Tuple[str, bool]:
    """
    Evaluates whether the input review is within Revio's validated operational domain.
    Text evidence strictly dominates client-supplied metadata.
    """
    clean = text.lower() if text else ""
    for pattern in UNVALIDATED_DOMAIN_PATTERNS:
        if re.search(pattern, clean):
            conflict_note = (
                f" (Conflicting with client '{explicit_domain}')"
                if explicit_domain and explicit_domain.lower() in VALIDATED_DOMAINS
                else ""
            )
            return f"Customer Support & Billing{conflict_note}", False

    if explicit_domain:
        norm_dom = explicit_domain.lower().strip()
        if norm_dom in VALIDATED_DOMAINS:
            return explicit_domain, True
        return f"Unvalidated Domain: '{explicit_domain}'", False

    return "Restaurants & Local Services", True

# ---------------------------------------------------------------------------
# 3. Model Loading & Lifecycle Management
# ---------------------------------------------------------------------------
def get_revio_model(version: Optional[str] = None):
    """
    Retrieves or initializes the model singleton.
    Defaults to environment variable REVIO_ACTIVE_MODEL (default 'candidate' in production).
    Strictly forbids silent fallback: if candidate is requested and missing, raises 503.
    """
    ver_str = version if isinstance(version, str) else None
    active_target = (ver_str or os.getenv("REVIO_ACTIVE_MODEL", "candidate")).lower().strip()

    if active_target not in ("champion", "candidate"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model version '{version}'. Allowed versions are 'champion' or 'candidate'."
        )

    if active_target == "candidate":
        if not CANDIDATE_MODEL_PATH.is_file():
            raise HTTPException(
                status_code=503,
                detail=f"Candidate model artifact '{CANDIDATE_MODEL_PATH.name}' is not available. Silent fallback to champion is prohibited."
            )
        model_path = CANDIDATE_MODEL_PATH
        meta_path = CANDIDATE_META_PATH
    else:
        if not CHAMPION_MODEL_PATH.is_file():
            raise HTTPException(
                status_code=503,
                detail=f"Champion model artifact '{CHAMPION_MODEL_PATH.name}' is not available."
            )
        model_path = CHAMPION_MODEL_PATH
        meta_path = CHAMPION_META_PATH

    if active_target not in _cached_models:
        loaded_model = joblib.load(model_path)
        _cached_models[active_target] = loaded_model
        try:
            vec = loaded_model.named_steps.get("features")
            if vec and hasattr(vec, "get_feature_names_out"):
                _cached_features[active_target] = vec.get_feature_names_out()
        except Exception:
            _cached_features[active_target] = None

        if meta_path.is_file():
            try:
                _cached_metas[active_target] = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                _cached_metas[active_target] = {}
        else:
            _cached_metas[active_target] = {}

    return _cached_models[active_target], _cached_metas[active_target]

# Pre-warm candidate model into memory during cold boot if artifact is present
try:
    get_revio_model(os.getenv("REVIO_ACTIVE_MODEL", "candidate"))
except Exception as e:
    pass

# ---------------------------------------------------------------------------
# 4. Pydantic Request & Response Schemas
# ---------------------------------------------------------------------------
class RevioPredictRequest(BaseModel):
    text: str = Field(..., max_length=100000, description="Customer review text")
    model_version: Optional[str] = Field(None, description="Optional target version: 'champion' or 'candidate'")
    domain: Optional[str] = Field(None, max_length=100, description="Optional domain label")

class ContributionCue(BaseModel):
    term: str = Field(..., description="N-gram term influencing linear log-odds")
    weight: float = Field(..., description="Linear log-odds contribution weight (X_j * beta_j)")
    polarity: str = Field(..., description="'Positive' if weight > 0 else 'Negative'")

class RevioPredictResponse(BaseModel):
    text: str
    sentiment: str
    positive_probability: float
    decision_threshold: float
    triage_status: str
    needs_human_review: bool
    word_contributions: List[ContributionCue]
    model_version: str
    latency_ms: Optional[float] = None
    domain: Optional[str] = None
    domain_validated: Optional[bool] = None

class BatchRevioRequest(BaseModel):
    reviews: List[str] = Field(..., description="List of reviews (max 100 per request)")
    model_version: Optional[str] = None

class ModelAuditInfo(BaseModel):
    active_default: str
    champion_available: bool
    candidate_available: bool
    candidate_threshold: float
    champion_threshold: float
    champion_path: str
    candidate_path: str

# ---------------------------------------------------------------------------
# 5. FastAPI Application Initialization & Routing
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Revio Customer Review Intelligence API",
    description="Stateless serverless machine learning inference service for customer feedback sentiment and triage.",
    version="1.0.0"
)

# CORS middleware enabling same-origin and development cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """System health check reporting active model status and verified offline benchmarks."""
    cand_avail = CANDIDATE_MODEL_PATH.is_file()
    champ_avail = CHAMPION_MODEL_PATH.is_file()
    active_env = os.getenv("REVIO_ACTIVE_MODEL", "candidate").lower().strip()
    
    return {
        "status": "healthy",
        "service": "Revio Vercel Serverless Intelligence Engine",
        "ml_service": True,
        "models_loaded": {
            "logistic_regression": cand_avail or champ_avail,
            "lstm": "offline_benchmark",
            "bert": "offline_benchmark"
        },
        "active_model": "yelp_word_char_lr_optimized" if active_env == "candidate" else "yelp_word_char_lr",
        "version": "1.0.0"
    }

@app.get("/api/v1/revio/models", response_model=ModelAuditInfo)
def get_models_audit():
    """Reports configuration and availability of champion and candidate models."""
    champ_avail = CHAMPION_MODEL_PATH.is_file()
    cand_avail = CANDIDATE_MODEL_PATH.is_file()
    
    champ_thresh = 0.48
    if champ_avail:
        try:
            _, champ_meta = get_revio_model("champion")
            champ_thresh = champ_meta.get("decision_threshold", 0.48)
        except Exception:
            pass

    cand_thresh = 0.55
    if cand_avail:
        try:
            _, cand_meta = get_revio_model("candidate")
            cand_thresh = cand_meta.get("decision_threshold", 0.55)
        except Exception:
            pass

    return ModelAuditInfo(
        active_default=os.getenv("REVIO_ACTIVE_MODEL", "candidate"),
        champion_available=champ_avail,
        candidate_available=cand_avail,
        champion_threshold=champ_thresh,
        candidate_threshold=cand_thresh,
        champion_path=str(CHAMPION_MODEL_PATH.name) if champ_avail else "Not deployed",
        candidate_path=str(CANDIDATE_MODEL_PATH.name) if cand_avail else "Not deployed",
    )

@app.post("/api/v1/revio/predict", response_model=RevioPredictResponse)
def predict_business_review(
    request: RevioPredictRequest,
    version: Optional[str] = Query(None, description="Override model version ('champion' or 'candidate')")
):
    """
    Classifies a customer review using the Logistic Regression pipeline.
    Calculates positive-class probability, extracts top-8 log-odds attribution cues,
    and applies unambiguous triage precedence.
    """
    start_time = time.perf_counter()
    target_version = version if isinstance(version, str) else request.model_version
    active_target = (target_version or os.getenv("REVIO_ACTIVE_MODEL", "candidate")).lower().strip()
    model, meta = get_revio_model(active_target)
    threshold = float(meta.get("decision_threshold", 0.55 if active_target == "candidate" else 0.48))

    clean_text = request.text.strip() if request.text else ""
    if not clean_text:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)
        return RevioPredictResponse(
            text=request.text,
            sentiment="Mixed",
            positive_probability=0.50,
            decision_threshold=threshold,
            triage_status="ESCALATE (Empty / Low Confidence)",
            needs_human_review=True,
            word_contributions=[],
            model_version=meta.get("model_name", "yelp_word_char_lr_optimized"),
            latency_ms=elapsed_ms,
            domain="Unknown",
            domain_validated=False
        )

    # 1. Domain Safeguard Evaluation
    detected_domain, is_domain_validated = detect_domain_safeguard(clean_text, request.domain)

    # 2. Probability Computation via Logistic Sigmoid Link
    probs = model.predict_proba([clean_text])[0]
    prob_pos = float(probs[1])

    # 3. Independent Decision Threshold Classification
    label = "Positive" if prob_pos >= threshold else "Negative"

    # 4. Explicit Triage Precedence Rules
    if 0.40 <= prob_pos <= 0.60:
        triage_status = "ESCALATE (Ambiguity / Low Confidence)"
        needs_human = True
    elif prob_pos < 0.40:
        triage_status = "ESCALATE (Negative / High Risk)"
        needs_human = True
    else:  # prob_pos > 0.60
        if is_domain_validated:
            triage_status = "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"
            needs_human = False
        else:
            triage_status = f"ESCALATE (Unvalidated Domain: {detected_domain} - Requires Human Verification)"
            needs_human = True

    # 5. Fast Linear Log-Odds Feature Attribution Extraction
    contributions: List[ContributionCue] = []
    try:
        vec = model.named_steps.get("features")
        clf = model.named_steps.get("classifier")
        if vec and clf:
            X = vec.transform([clean_text])
            feature_names = _cached_features.get(active_target)
            if feature_names is None:
                feature_names = vec.get_feature_names_out()
                _cached_features[active_target] = feature_names

            coefs = clf.coef_[0]
            nonzeros = X.nonzero()[1]
            raw_cues = []
            for idx in nonzeros:
                fname = feature_names[idx]
                clean_name = fname.split("__")[-1] if "__" in fname else fname
                val = float(X[0, idx] * coefs[idx])
                raw_cues.append((clean_name, val))

            raw_cues.sort(key=lambda x: abs(x[1]), reverse=True)
            seen = set()
            for w, val in raw_cues:
                if w.lower() not in seen and len(w) > 2:
                    seen.add(w.lower())
                    contributions.append(ContributionCue(
                        term=w,
                        weight=round(val, 4),
                        polarity="Positive" if val > 0 else "Negative"
                    ))
                if len(contributions) >= 8:
                    break
    except Exception:
        pass

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)

    return RevioPredictResponse(
        text=request.text,
        sentiment=label,
        positive_probability=round(prob_pos, 4),
        decision_threshold=threshold,
        triage_status=triage_status,
        needs_human_review=needs_human,
        word_contributions=contributions,
        model_version=meta.get("model_name", "yelp_word_char_lr_optimized"),
        latency_ms=elapsed_ms,
        domain=detected_domain,
        domain_validated=is_domain_validated
    )

@app.post("/api/v1/revio/batch")
def predict_batch_reviews(request: BatchRevioRequest):
    """Batched review classification supporting size-aware chunked processing."""
    if len(request.reviews) > 100:
        raise HTTPException(status_code=400, detail="Batch exceeds maximum limit of 100 reviews per request.")

    results = []
    for text in request.reviews:
        if text and text.strip():
            results.append(predict_business_review(
                RevioPredictRequest(text=text.strip(), model_version=request.model_version)
            ))
    return {"count": len(results), "reviews": results}
