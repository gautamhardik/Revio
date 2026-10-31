from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PredictRequest(BaseModel):
    text: str = Field(..., description="The movie review text to analyze")
    models: List[str] = Field(
        default=["lr", "lstm", "bert"],
        description="List of models to use for prediction"
    )

class ModelPrediction(BaseModel):
    name: str
    label: str
    confidence: float
    latency_ms: float
    top_positive_words: Optional[List[str]] = None
    top_negative_words: Optional[List[str]] = None
    reasoning: str

class ModelVersions(BaseModel):
    lr: str
    lstm: str
    bert: str

class PredictMetadata(BaseModel):
    model_versions: ModelVersions

class OverallPrediction(BaseModel):
    label: str
    agreement: str
    needs_human_review: Optional[bool] = False

class TimingInfo(BaseModel):
    total_ms: float

class PredictResponse(BaseModel):
    overall: OverallPrediction
    models: Dict[str, Any]
    timing: TimingInfo
    metadata: PredictMetadata
    errors: Optional[List[Dict[str, str]]] = None

class ModelMetadata(BaseModel):
    name: str
    type: str
    accuracy: float
    version: str
    size: str
