import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Screening Room - ML Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Model paths (relative to project root when running via docker/uvicorn)
    MODELS_ML_DIR: str = os.getenv("MODELS_ML_DIR", "../models_ml")
    MODELS_LSTM_DIR: str = os.getenv("MODELS_LSTM_DIR", "../models_lstm")
    MODELS_BERT_DIR: str = os.getenv("MODELS_BERT_DIR", "../models_bert/tuned")
    DATA_DIR: str = os.getenv("DATA_DIR", "../data")

    class Config:
        case_sensitive = True

settings = Settings()
