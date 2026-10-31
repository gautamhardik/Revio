import time
import logging
import traceback
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from app.schemas.prediction import (
    PredictRequest,
    PredictResponse,
    OverallPrediction,
    TimingInfo,
    PredictMetadata,
    ModelVersions
)
from app.services.model_loader import model_manager
from app.services.predictor import predict_lr, predict_lstm, predict_bert

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL_VERSIONS = ModelVersions(
    lr="1.0.0",
    lstm="1.0.0",
    bert="1.0.0"
)

@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    start_time = time.perf_counter()
    models_result = {}
    
    pos_count = 0
    neg_count = 0
    total_count = 0
    errors: List[Dict[str, str]] = []
    
    def try_predict(model_key: str, predict_fn, text: str):
        nonlocal pos_count, neg_count, total_count
        try:
            result = predict_fn(text)
            if result is None:
                logger.warning(f"Model {model_key} returned None")
                errors.append({"model": model_key, "error": "Inference unavailable"})
                return
            models_result[model_key] = result
            total_count += 1
            if result.label == "Positive":
                pos_count += 1
            else:
                neg_count += 1
        except Exception as e:
            logger.error(f"Error during {model_key} inference: {str(e)}\n{traceback.format_exc()}")
            errors.append({"model": model_key, "error": "Inference unavailable"})
    
    if "lr" in request.models:
        try_predict("lr", predict_lr, request.text)
    if "lstm" in request.models:
        try_predict("lstm", predict_lstm, request.text)
    if "bert" in request.models:
        try_predict("bert", predict_bert, request.text)
        
    if total_count == 0:
        error_summary = ", ".join([f"{err['model']}: {err['error']}" for err in errors])
        raise HTTPException(status_code=503, detail=f"No models available: {error_summary}")
        
    total_valid = pos_count + neg_count

    if total_valid == 0:
        majority_label = "Unavailable"
    elif pos_count > neg_count:
        majority_label = "Positive"
    elif neg_count > pos_count:
        majority_label = "Negative"
    else:
        majority_label = "Mixed / No Consensus"

    agreement = f"{max(pos_count, neg_count)}/{total_valid}"
    # Flag for Revio/TenantEase human-in-the-loop triage if negative, tied, or models disagree
    needs_human_review = (
        majority_label in ("Negative", "Mixed / No Consensus")
        or max(pos_count, neg_count) < total_valid
    )
    
    total_ms = (time.perf_counter() - start_time) * 1000
    
    return PredictResponse(
        overall=OverallPrediction(
            label=majority_label,
            agreement=agreement,
            needs_human_review=needs_human_review
        ),
        models=models_result,
        timing=TimingInfo(total_ms=total_ms),
        metadata=PredictMetadata(model_versions=MODEL_VERSIONS),
        errors=errors if errors else None
    )

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "backend": False,
        "ml_service": True,
        "database": False,
        "models_loaded": {
            "logistic_regression": model_manager.models_loaded.get("logistic_regression", False),
            "lstm": model_manager.models_loaded.get("lstm", False),
            "bert": model_manager.models_loaded.get("bert", False)
        },
        "load_errors": model_manager.load_errors,
        "version": "1.0.0"
    }

@router.get("/models")
async def get_models() -> Dict[str, Any]:
    return {
        "lr": {
            "name": "Logistic Regression (TF-IDF)",
            "type": "Machine Learning",
            "version": MODEL_VERSIONS.lr,
            "description": "Bag-of-words classifier using TF-IDF features"
        },
        "lstm": {
            "name": "Bi-LSTM",
            "type": "Deep Learning",
            "version": MODEL_VERSIONS.lstm,
            "description": "Bidirectional recurrent neural network"
        },
        "bert": {
            "name": "BERT (Fine-Tuned)",
            "type": "Transformer",
            "version": MODEL_VERSIONS.bert,
            "description": "Fine-tuned contextual embedding model"
        }
    }

@router.get("/model_metrics")
async def get_model_metrics() -> Dict[str, Any]:
    return {
        # Minimal mock payload for now, database will hold the real ones
        "status": "Not implemented here, served by DB via Gateway"
    }
