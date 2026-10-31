import time
import numpy as np
import tensorflow as tf
import torch
import torch.nn.functional as F

from app.services.model_loader import model_manager
from app.services.explainer import get_lr_important_words, generate_reasoning
from app.utils.preprocessing import (
    preprocess_for_tfidf,
    text_to_sequence,
    preprocess_for_bert
)
from app.schemas.prediction import ModelPrediction

def _normalize_conf(prob_pos: float, threshold: float) -> float:
    if prob_pos >= threshold:
        return 0.5 + 0.5 * ((prob_pos - threshold) / (1.0 - threshold)) if threshold < 1.0 else 1.0
    else:
        return 0.5 + 0.5 * ((threshold - prob_pos) / threshold) if threshold > 0.0 else 1.0


def predict_lr(text: str) -> ModelPrediction:
    start_time = time.perf_counter()
    
    if not model_manager.models_loaded["logistic_regression"]:
        raise RuntimeError("LR Model not loaded")
        
    vec = model_manager.lr_vectorizer
    mdl = model_manager.lr_model
    
    cleaned = preprocess_for_tfidf(text)
    features = vec.transform([cleaned])
    proba = mdl.predict_proba(features)[0]
    
    label_idx = int(np.argmax(proba))
    label = "Positive" if label_idx == 1 else "Negative"
    confidence = float(proba[label_idx])
    
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    top_pos, top_neg = get_lr_important_words(cleaned, vec, mdl)
    
    return ModelPrediction(
        name="The Statistician",
        label=label,
        confidence=confidence,
        latency_ms=latency_ms,
        top_positive_words=top_pos,
        top_negative_words=top_neg,
        reasoning=generate_reasoning("lr", confidence, latency_ms)
    )

def predict_lstm(text: str) -> ModelPrediction:
    start_time = time.perf_counter()
    
    if not model_manager.models_loaded["lstm"]:
        raise RuntimeError("LSTM Model not loaded")
        
    mdl = model_manager.lstm_model
    tok = model_manager.lstm_tokenizer
    cfg = model_manager.lstm_config
    
    max_len = cfg.get("max_len", 300)
    threshold = cfg.get("best_threshold", 0.5)
    
    seq = text_to_sequence(text, tok, max_len)
    tensor_seq = tf.convert_to_tensor(seq)
    raw = model_manager.lstm_fast_predict(tensor_seq).numpy()[0][0]
    
    label = "Positive" if raw >= threshold else "Negative"
    conf = _normalize_conf(float(raw), threshold)
    
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    return ModelPrediction(
        name="The Sequentialist",
        label=label,
        confidence=conf,
        latency_ms=latency_ms,
        reasoning=generate_reasoning("lstm", conf, latency_ms)
    )

def predict_bert(text: str) -> ModelPrediction:
    start_time = time.perf_counter()
    
    if not model_manager.models_loaded["bert"]:
        raise RuntimeError("BERT Model not loaded")
        
    mdl = model_manager.bert_model
    tok = model_manager.bert_tokenizer
    dev = model_manager.device
    threshold = model_manager.bert_threshold
    
    cleaned = preprocess_for_bert(text)
    inputs = tok(cleaned, return_tensors="pt", truncation=True, padding=True, max_length=128)
    inputs = {k: v.to(dev) for k, v in inputs.items()}
    
    with torch.no_grad():
        logits = mdl(**inputs).logits
        
    proba = F.softmax(logits, dim=-1).cpu().numpy()[0]
    prob_pos = float(proba[1])
    
    label = "Positive" if prob_pos >= threshold else "Negative"
    conf = _normalize_conf(prob_pos, threshold)
    
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    return ModelPrediction(
        name="The Contextualist",
        label=label,
        confidence=conf,
        latency_ms=latency_ms,
        reasoning=generate_reasoning("bert", conf, latency_ms)
    )
