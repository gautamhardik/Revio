import os
import joblib
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

revio_router = APIRouter(prefix="/revio", tags=["Revio Business Review"])

REPO_ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS_DIR = REPO_ROOT / "revio_business_review_experiment" / "artifacts"

CHAMPION_MODEL_PATH = ARTIFACTS_DIR / "yelp_word_char_lr.joblib"
CHAMPION_META_PATH = ARTIFACTS_DIR / "yelp_word_char_lr.metadata.json"

CANDIDATE_MODEL_PATH = ARTIFACTS_DIR / "yelp_word_char_lr_candidate.joblib"
CANDIDATE_META_PATH = ARTIFACTS_DIR / "yelp_word_char_lr_candidate.metadata.json"

_cached_models: Dict[str, Any] = {}
_cached_metas: Dict[str, Any] = {}
_cached_features: Dict[str, Any] = {}

# Supported / validated domain keywords (Yelp-aligned business types)
VALIDATED_DOMAINS = {
    "restaurant", "restaurants", "dining", "food", "cafe", "cafes", "bistro", "bar", "bakery",
    "hotel", "hotels", "hospitality", "stay", "lodging", "motel", "resort",
    "travel", "facilities", "local_service", "local_business", "general_local", "general"
}

# Domain shift trigger phrases (Customer Support, Billing Disputes, IT Telecom, SaaS)
UNVALIDATED_DOMAIN_PATTERNS = [
    # Billing & Finance disputes
    "billing dispute", "unauthorized charge", "unauthorized fee", "hidden charge",
    "chargeback", "overdraft fee", "recurring charge", "auto-renewal", "cancellation fee",
    "fraud alert", "wire transfer", "dispute transaction", "billing department",
    # Customer support / IVR / ticketing
    "phone tree", "ivr loop", "support ticket", "ticket number", "unresolved ticket",
    "representative hung up", "customer support agent", "tier 2 support", "customer care rep",
    "automated phone system", "cancel subscription", "hold time was 4", "on hold for 2 hours",
    # Telecom & IT infrastructure / SaaS
    "router firmware", "broadband outage", "account locked", "password reset", "api key",
    "software bug", "server error", "api downtime", "firmware update", "sdk crash",
    "database timeout", "sim card", "data cap", "roaming charges", "lost in transit", "rma number"
]

def detect_domain_safeguard(text: str, explicit_domain: Optional[str] = None) -> tuple[str, bool]:
    """
    Evaluates whether the input review is within Revio's validated operational domain
    (Restaurants, Hospitality, Travel, Local Business) or in an unvalidated domain
    (Customer Support, IT, Complex Billing, Telecom) that requires human review safeguards.

    Security & Routing Policy:
    1. Text Evidence Precedence: If out-of-domain patterns are detected in text, the review
       is flagged as unvalidated REGARDLESS of any client-supplied domain metadata.
       Untrusted client metadata cannot override text evidence.
    2. Explicit Domain Validation: If no text pattern matches, explicit_domain is checked.
       If supplied and NOT in VALIDATED_DOMAINS, it defaults to unvalidated (human review).
    3. Conflicting / Unknown Domains: Default to needs_human_review = True.
    4. Prohibited Action: Unvalidated domains can NEVER be marked as Low Priority / No Review.

    Known Router Limitations:
    - False Positives (FP): A dining review mentioning a credit card machine glitch
      (e.g., 'charged twice by mistake') may trigger billing keywords and be routed to human
      review. This conservative behavior protects operational safety at the cost of minor triage friction.
    - False Negatives (FN): Out-of-domain complaints written in generic language without keyword triggers
      (e.g., 'no one replied to my email after five days') rely on probability ambiguity corridors
      [0.40, 0.60] rather than domain keywords.
    """
    text_lower = text.lower()

    # 1. Text evidence check ALWAYS runs first to prevent client metadata bypass
    for pattern in UNVALIDATED_DOMAIN_PATTERNS:
        if pattern in text_lower:
            # Client domain cannot override detected text signal
            if explicit_domain and explicit_domain.lower().strip() in VALIDATED_DOMAINS:
                return f"Customer Support & Billing (Conflicting with client '{explicit_domain}')", False
            return "Customer Support & Billing (Detected from Text)", False

    # 2. Check client-supplied domain metadata
    if explicit_domain:
        norm_dom = explicit_domain.lower().strip()
        if norm_dom in VALIDATED_DOMAINS:
            return explicit_domain, True
        # Unknown or unvalidated client domain -> default to human review
        return f"Unvalidated Domain: '{explicit_domain}'", False

    # 3. Default for text without trigger phrases in standard local review mode
    return "Restaurants & Local Services", True

def get_revio_model(version: Optional[str] = None):
    """
    Returns (model, metadata) for requested version ('champion' or 'candidate').
    Defaults to environment variable REVIO_ACTIVE_MODEL (default 'champion').
    Strictly forbids silent fallback: if candidate is requested and unavailable, raises 503.
    """
    ver_str = version if isinstance(version, str) else None
    active_target = (ver_str or os.getenv("REVIO_ACTIVE_MODEL", "champion")).lower().strip()

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

class RevioPredictRequest(BaseModel):
    text: str = Field(..., description="Customer business or service review")
    model_version: Optional[str] = Field(None, description="Optional target version: 'champion' or 'candidate'")
    domain: Optional[str] = Field(None, description="Optional domain: e.g. 'restaurant', 'hotel', 'customer_support'")

class ContributionCue(BaseModel):
    term: str = Field(..., description="N-gram term influencing linear log-odds")
    weight: float = Field(..., description="Linear log-odds contribution weight (X_j * beta_j), not a probability percentage")
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
    reviews: List[str]
    model_version: Optional[str] = None

class ModelAuditInfo(BaseModel):
    active_default: str
    champion_available: bool
    candidate_available: bool
    candidate_threshold: float
    champion_threshold: float
    champion_path: str
    candidate_path: str

@revio_router.get("/models", response_model=ModelAuditInfo)
def get_models_audit():
    """Reports configuration and availability of champion and candidate models."""
    _, champ_meta = get_revio_model("champion")
    cand_avail = CANDIDATE_MODEL_PATH.is_file()
    cand_thresh = 0.55
    if cand_avail:
        try:
            _, cand_meta = get_revio_model("candidate")
            cand_thresh = cand_meta.get("decision_threshold", 0.55)
        except Exception:
            pass

    return ModelAuditInfo(
        active_default=os.getenv("REVIO_ACTIVE_MODEL", "champion"),
        champion_available=CHAMPION_MODEL_PATH.is_file(),
        candidate_available=cand_avail,
        champion_threshold=champ_meta.get("decision_threshold", 0.48),
        candidate_threshold=cand_thresh,
        champion_path=str(CHAMPION_MODEL_PATH.name),
        candidate_path=str(CANDIDATE_MODEL_PATH.name) if cand_avail else "Not deployed",
    )

@revio_router.post("/predict", response_model=RevioPredictResponse)
def predict_business_review(
    request: RevioPredictRequest,
    version: Optional[str] = Query(None, description="Override model version ('champion' or 'candidate')")
):
    start_time = time.perf_counter()
    target_version = version if isinstance(version, str) else request.model_version
    active_target = (target_version or os.getenv("REVIO_ACTIVE_MODEL", "champion")).lower().strip()
    model, meta = get_revio_model(active_target)
    threshold = float(meta.get("decision_threshold", 0.48))
    
    # Handle empty / whitespace input gracefully
    clean_text = request.text.strip() if request.text else ""
    if not clean_text:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)
        return RevioPredictResponse(
            text=request.text,
            sentiment="Mixed",
            positive_probability=0.50,
            decision_threshold=threshold,
            triage_status="ESCALATE (Ambiguity / Low Confidence)",
            needs_human_review=True,
            word_contributions=[],
            model_version=meta.get("model_name", "yelp_word_char_lr"),
            latency_ms=elapsed_ms,
            domain="General",
            domain_validated=True
        )

    # Domain safeguard detection
    detected_domain, is_domain_validated = detect_domain_safeguard(clean_text, request.domain)

    # Predict probabilities (standard Logistic Regression output sigmoid(z))
    prob_pos = float(model.predict_proba([clean_text])[0][1])
    
    # Decision threshold applied independently to determine sentiment label:
    label = "Positive" if prob_pos >= threshold else "Negative"
    
    # Operational Triage decision with explicit precedence:
    # 1. Ambiguity corridor [0.40, 0.60] -> route to human review for ambiguity
    # 2. Otherwise, if prob_pos < 0.40 -> classify as negative and escalate
    # 3. Otherwise, if prob_pos > 0.60:
    #    - If unvalidated domain -> route to human review explaining outside validated domain
    #    - If validated domain -> LOW PRIORITY / NO HUMAN REVIEW REQUIRED
    if 0.40 <= prob_pos <= 0.60:
        triage_status = "ESCALATE (Ambiguity / Low Confidence)"
        needs_human = True
    elif prob_pos < 0.40:
        triage_status = "ESCALATE (Negative / High Risk)"
        needs_human = True
    else:
        # prob_pos > 0.60
        if not is_domain_validated:
            triage_status = f"ESCALATE (Unvalidated Domain: {detected_domain} - Requires Human Verification)"
            needs_human = True
        else:
            triage_status = "LOW PRIORITY / NO HUMAN REVIEW REQUIRED"
            needs_human = False
        
    # Extract linear log-odds feature attribution cues (X_j * beta_j)
    contributions: List[ContributionCue] = []
    try:
        vec = model.named_steps.get("features")
        clf = model.named_steps.get("classifier")
        if vec and clf:
            X = vec.transform([clean_text])
            coefs = clf.coef_[0]
            indices = X.nonzero()[1]
            feature_names = _cached_features.get(active_target)
            if feature_names is None:
                feature_names = vec.get_feature_names_out()
                _cached_features[active_target] = feature_names
            
            raw_cues = []
            for idx in indices:
                name = feature_names[idx]
                clean_name = name.replace("word__", "").replace("char__", "").strip()
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
        model_version=meta.get("model_name", "yelp_word_char_lr"),
        latency_ms=elapsed_ms,
        domain=detected_domain,
        domain_validated=is_domain_validated
    )

@revio_router.post("/batch")
def predict_batch_reviews(request: BatchRevioRequest):
    if len(request.reviews) > 100:
        raise HTTPException(status_code=400, detail="Batch exceeds maximum limit of 100 reviews.")
        
    results = []
    for text in request.reviews:
        if text and text.strip():
            results.append(predict_business_review(
                RevioPredictRequest(text=text.strip(), model_version=request.model_version)
            ))
    return {"count": len(results), "reviews": results}

