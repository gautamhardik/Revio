import numpy as np
from typing import List, Tuple

def get_lr_important_words(text: str, vectorizer, model, top_n: int = 5) -> Tuple[List[str], List[str]]:
    """Extract top positive and negative words for LR prediction based on TF-IDF weights."""
    if not vectorizer or not model:
        return [], []
        
    try:
        # Transform the single document
        tfidf_vec = vectorizer.transform([text])
        
        # Get feature names (vocabulary)
        feature_names = vectorizer.get_feature_names_out()
        
        # Get the non-zero feature indices and their tf-idf values in this document
        doc_indices = tfidf_vec.nonzero()[1]
        
        # Multiply by model coefficients to get importance
        # model.coef_[0] because it's a binary classifier
        importances = [(feature_names[idx], tfidf_vec[0, idx] * model.coef_[0][idx]) for idx in doc_indices]
        
        # Sort by importance
        importances.sort(key=lambda x: x[1])
        
        # Deduplicate overlapping tokens (e.g. "movie" vs "movie ended") globally
        def deduplicate(word_score_pairs, n, exclude_words=None):
            if exclude_words is None:
                exclude_words = []
            kept = []
            for word, _ in word_score_pairs:
                is_dup = any((word in k or k in word) for k in kept + exclude_words)
                if not is_dup:
                    kept.append(word)
                if len(kept) == n:
                    break
            return kept
            
        # Top positive (highest positive values)
        pos_pairs = [(word, score) for word, score in reversed(importances) if score > 0]
        top_pos = deduplicate(pos_pairs, top_n)
        
        # Top negative (lowest negative values), excluding any already in positive
        neg_pairs = [(word, score) for word, score in importances if score < 0]
        top_neg = deduplicate(neg_pairs, top_n, exclude_words=top_pos)
        
        return top_pos, top_neg
    except Exception:
        return [], []

def generate_reasoning(model_name: str, confidence: float, latency: float) -> str:
    """Generate honest explanation for model behavior."""
    
    conf_label = "high" if confidence >= 0.80 else "moderate" if confidence >= 0.60 else "low"
    
    if model_name == "lr":
        return f"TF-IDF representation evaluated independently. Captured {conf_label} confidence based on aggregated term weights."
    
    elif model_name == "lstm":
        return f"Bidirectional recurrent layers processed the sequence chronologically, retaining context window to yield {conf_label} confidence."
        
    elif model_name == "bert":
        return f"Transformer self-attention evaluated full bidirectional context across 12 layers, resulting in {conf_label} confidence."
        
    return ""
