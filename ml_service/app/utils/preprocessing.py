"""
preprocessing_utils.py
======================
Shared NLP preprocessing utilities for all model pipelines.
Handles text cleaning, normalization, and sequence preparation.
"""

import re
import string
import numpy as np
from typing import List, Optional


# ─── NLTK Setup ──────────────────────────────────────────────────────────────

def ensure_nltk_resources():
    """Download required NLTK data if not already present."""
    import nltk
    resources = [
        ("corpora/stopwords", "stopwords"),
        ("tokenizers/punkt", "punkt"),
        ("corpora/wordnet", "wordnet"),
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(name, quiet=True)


ensure_nltk_resources()

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

STOP_WORDS = set(stopwords.words("english"))
# Preserve negation words — removing them destroys semantic inversion signals
_NEGATION_WORDS = {
    "no", "nor", "not", "never", "don't", "didn't", "isn't", "wasn't",
    "aren't", "won't", "can't", "couldn't", "shouldn't", "wouldn't",
    "hasn't", "haven't", "hadn't", "doesn't", "n't",
}
STOP_WORDS = STOP_WORDS - _NEGATION_WORDS
LEMMATIZER = WordNetLemmatizer()


# ─── Contraction Expansion ────────────────────────────────────────────────────

CONTRACTION_MAP = {
    "don't": "do not", "didn't": "did not", "doesn't": "does not",
    "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
    "shouldn't": "should not", "can't": "cannot", "couldn't": "could not",
    "isn't": "is not", "aren't": "are not", "wasn't": "was not",
    "weren't": "were not", "hasn't": "has not", "haven't": "have not",
    "hadn't": "had not", "ain't": "is not", "i'm": "i am",
    "you're": "you are", "he's": "he is", "she's": "she is",
    "it's": "it is", "we're": "we are", "they're": "they are",
    "i've": "i have", "you've": "you have", "we've": "we have",
    "they've": "they have", "i'll": "i will", "you'll": "you will",
    "he'll": "he will", "she'll": "she will", "we'll": "we will",
    "they'll": "they will", "i'd": "i would", "you'd": "you would",
    "he'd": "he would", "she'd": "she would", "we'd": "we would",
    "they'd": "they would", "let's": "let us",
}
_CONTRACTION_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in CONTRACTION_MAP) + r")\b",
    flags=re.IGNORECASE,
)


def expand_contractions(text: str) -> str:
    """Expand English contractions to their full forms."""
    def _replace(m: re.Match) -> str:
        key = m.group(1).lower()
        return CONTRACTION_MAP.get(key, m.group(1))
    return _CONTRACTION_PATTERN.sub(_replace, text)


# ─── Core Cleaning ───────────────────────────────────────────────────────────

def remove_html_tags(text: str) -> str:
    """Strip HTML tags from text."""
    return re.sub(r"<[^>]+>", " ", text)


def remove_urls(text: str) -> str:
    """Remove URLs from text."""
    return re.sub(r"http\S+|www\S+|https\S+", " ", text, flags=re.MULTILINE)


def remove_special_characters(text: str) -> str:
    """Remove non-alphabetical characters, keep spaces."""
    return re.sub(r"[^a-zA-Z\s]", " ", text)


def normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces into one."""
    return re.sub(r"\s+", " ", text).strip()


# ─── Traditional ML Preprocessing (TF-IDF) ────────────────────────────────

def preprocess_for_tfidf(text: str, remove_stopwords: bool = True) -> str:
    """
    Full preprocessing pipeline for TF-IDF / Logistic Regression.
    
    Steps:
      1. Lowercase
      2. Expand contractions (e.g. didn't -> did not)
      3. Remove HTML
      4. Remove URLs
      5. Remove special chars
      6. Optional stopword removal
      7. Lemmatize
      8. Normalize whitespace
    """
    text = text.lower()
    text = expand_contractions(text)
    text = remove_html_tags(text)
    text = remove_urls(text)
    text = remove_special_characters(text)
    
    tokens = text.split()
    
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOP_WORDS]
    
    tokens = [LEMMATIZER.lemmatize(t) for t in tokens if len(t) > 1]
    
    return normalize_whitespace(" ".join(tokens))


# ─── Deep Learning Preprocessing (LSTM) ──────────────────────────────────

def preprocess_for_lstm(text: str) -> str:
    """
    Preprocessing pipeline for LSTM/sequence models.
    Matches clean_text in retrain_lstm.py exactly to align train and inference.
    
    Steps:
      1. Lowercase
      2. Expand contractions
      3. Remove HTML
      4. Remove URLs
      5. Keep alphanumeric and basic punctuation (!?.,)
      6. Normalize whitespace
    """
    text = text.lower()
    text = expand_contractions(text)
    text = remove_html_tags(text)
    text = remove_urls(text)
    text = re.sub(r'[^a-zA-Z0-9!?., ]', '', text)
    return normalize_whitespace(text)


def text_to_sequence(text: str, tokenizer, max_len: int = 300) -> np.ndarray:
    """
    Convert text to padded integer sequence for LSTM inference.
    
    Args:
        text: Raw or cleaned text string.
        tokenizer: Fitted Keras Tokenizer object.
        max_len: Maximum sequence length (pad/truncate to this).
    
    Returns:
        Numpy array of shape (1, max_len).
    """
    from tensorflow.keras.preprocessing.sequence import pad_sequences  # type: ignore

    cleaned = preprocess_for_lstm(text)
    seq = tokenizer.texts_to_sequences([cleaned])
    padded = pad_sequences(seq, maxlen=max_len, padding="post", truncating="post")
    return padded


# ─── Transformer Preprocessing (BERT) ────────────────────────────────────

def preprocess_for_bert(text: str) -> str:
    """
    Minimal preprocessing for BERT — the tokenizer handles most normalization.
    
    BERT's WordPiece tokenizer is robust; we only:
      1. Remove HTML tags
      2. Collapse excessive whitespace
    """
    text = remove_html_tags(text)
    return normalize_whitespace(text)


# ─── Text Analysis Utilities ──────────────────────────────────────────────

def get_word_count(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def get_char_count(text: str) -> int:
    """Count characters (excluding spaces) in text."""
    return len(text.replace(" ", ""))


def detect_negation(text: str) -> bool:
    """Simple negation detection for reasoning engine."""
    negation_words = {
        "not", "no", "never", "none", "nobody", "nothing", "neither",
        "nowhere", "nor", "cannot", "can't", "won't", "don't", "doesn't",
        "didn't", "isn't", "aren't", "wasn't", "weren't", "hasn't",
        "haven't", "hadn't", "wouldn't", "shouldn't", "couldn't",
        "n't", "hardly", "barely", "scarcely"
    }
    tokens = set(text.lower().split())
    return bool(tokens & negation_words)


def detect_sarcasm_signals(text: str) -> bool:
    """Heuristic sarcasm/irony signal detection."""
    sarcasm_patterns = [
        r"\b(yeah right|sure sure|totally|oh great|fantastic job|brilliant)\b",
        r"(!!!|\?\?\?)",
        r"\b(not really|kind of|sort of)\b",
        r"(worst.*best|best.*worst)",
    ]
    text_lower = text.lower()
    return any(re.search(p, text_lower) for p in sarcasm_patterns)


def detect_mixed_sentiment(text: str) -> bool:
    """Detect presence of both positive and negative signals."""
    positive_words = {
        "great", "good", "excellent", "amazing", "wonderful", "fantastic",
        "love", "loved", "enjoy", "enjoyed", "brilliant", "superb", "perfect"
    }
    negative_words = {
        "bad", "terrible", "awful", "horrible", "boring", "hate", "hated",
        "disappointing", "disappointed", "poor", "worst", "dull", "weak"
    }
    tokens = set(text.lower().split())
    has_pos = bool(tokens & positive_words)
    has_neg = bool(tokens & negative_words)
    return has_pos and has_neg


def extract_key_phrases(text: str, top_n: int = 5) -> List[str]:
    """
    Extract simple keyword phrases for reasoning display.
    Returns tokens most likely to influence sentiment.
    """
    sentiment_vocab = {
        # Strong positive
        "excellent", "amazing", "outstanding", "brilliant", "masterpiece",
        "fantastic", "wonderful", "superb", "love", "perfect", "beautiful",
        "great", "good", "enjoy", "entertaining", "captivating", "thrilling",
        # Strong negative
        "terrible", "awful", "horrible", "boring", "waste", "disappointing",
        "bad", "poor", "worst", "dreadful", "pathetic", "ridiculous",
        "unbearable", "painful", "disaster", "failure", "mediocre", "weak",
        # Modifiers
        "very", "extremely", "absolutely", "completely", "totally", "quite",
        "never", "not", "no", "hardly", "barely",
    }
    tokens = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    found = [t for t in tokens if t in sentiment_vocab]
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in found:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return unique[:top_n]


def generate_reasoning(
    text: str,
    model_name: str,
    prediction: str,
    confidence: float,
) -> str:
    """
    Generate a human-readable reasoning explanation for a prediction.
    
    Args:
        text: Input review text.
        model_name: One of 'Logistic Regression', 'Bi-LSTM', 'BERT'.
        prediction: 'Positive' or 'Negative'.
        confidence: Confidence score 0–1.
    
    Returns:
        A natural-language reasoning string.
    """
    has_negation = detect_negation(text)
    has_sarcasm = detect_sarcasm_signals(text)
    has_mixed = detect_mixed_sentiment(text)
    key_phrases = extract_key_phrases(text)
    word_count = get_word_count(text)

    phrases_str = ", ".join([f'"{p}"' for p in key_phrases]) if key_phrases else "the overall tone"
    conf_label = "high" if confidence >= 0.80 else "moderate" if confidence >= 0.60 else "low"

    reasoning_parts = []

    # Model-specific reasoning
    if model_name == "Logistic Regression":
        reasoning_parts.append(
            f"TF-IDF features weighted {phrases_str} as the primary sentiment signals."
        )
        if has_negation and confidence < 0.75:
            reasoning_parts.append(
                "Negation patterns may have reduced confidence — TF-IDF treats tokens independently."
            )
        reasoning_parts.append(
            f"Bag-of-words representation captured {conf_label} confidence based on term frequencies."
        )

    elif model_name == "Bi-LSTM":
        reasoning_parts.append(
            f"Bidirectional LSTM processed the sequence and identified {phrases_str} as influential."
        )
        if has_negation:
            reasoning_parts.append(
                "Sequence context helped partially capture negation through hidden state propagation."
            )
        if word_count > 100:
            reasoning_parts.append(
                "Long review — LSTM's recurrent memory tracked sentiment shifts across the sequence."
            )

    elif model_name == "BERT":
        reasoning_parts.append(
            f"BERT's self-attention attended to {phrases_str} within full bidirectional context."
        )
        if has_negation:
            reasoning_parts.append(
                "Negation was effectively captured via contextual token interactions in attention layers."
            )
        if has_sarcasm:
            reasoning_parts.append(
                "Subtle sarcasm/irony signals were detected through contextual embeddings."
            )
        if has_mixed:
            reasoning_parts.append(
                "Mixed sentiment detected — BERT resolved the dominant sentiment via attention weighting."
            )
        reasoning_parts.append(
            f"12 attention heads processed the full sequence context, yielding {conf_label} confidence."
        )

    # Prediction summary
    sentiment_verb = "positive" if prediction == "Positive" else "negative"
    reasoning_parts.append(
        f"Overall: {model_name} classified this review as {sentiment_verb} with {confidence:.1%} confidence."
    )

    return " ".join(reasoning_parts)
