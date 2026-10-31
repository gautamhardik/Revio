"""
Revio Split Accounting & Data Preparation Script
Deterministically samples from fancyzhx/yelp_polarity with exact class balance,
verifies integrity and deduplication, and creates isolated Train, Validation, and untouched Test sets.
"""
import json
import itertools
from pathlib import Path
import numpy as np
import joblib
from datasets import load_dataset
from sklearn.model_selection import train_test_split

DATASET_ID = "fancyzhx/yelp_polarity"
OUTPUT_DIR = Path(__file__).resolve().parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
TRAIN_SAMPLE_COUNT = 12_000
TEST_SAMPLE_COUNT = 3_000
VAL_FRACTION = 0.20

def collect_balanced_split(split_name: str, total_count: int, seed: int) -> tuple[list[str], list[int]]:
    print(f"Collecting {total_count:,} balanced examples from {split_name} split...")
    dataset = load_dataset(DATASET_ID, split=split_name, streaming=True)
    shuffled = dataset.shuffle(seed=seed, buffer_size=100_000)
    
    target_per_class = total_count // 2
    neg_texts = []
    pos_texts = []
    seen_texts = set()
    
    for row in shuffled:
        text = row.get("text", "")
        if not isinstance(text, str):
            continue
        cleaned = text.strip()
        if len(cleaned) < 10 or cleaned in seen_texts:
            continue
        seen_texts.add(cleaned)
        
        lbl = int(row.get("label", -1))
        if lbl == 0 and len(neg_texts) < target_per_class:
            neg_texts.append(cleaned)
        elif lbl == 1 and len(pos_texts) < target_per_class:
            pos_texts.append(cleaned)
            
        if len(neg_texts) >= target_per_class and len(pos_texts) >= target_per_class:
            break
            
    combined_texts = neg_texts + pos_texts
    combined_labels = [0] * len(neg_texts) + [1] * len(pos_texts)
    
    # Deterministic shuffle together
    rng = np.random.RandomState(seed)
    perm = rng.permutation(len(combined_texts))
    shuffled_texts = [combined_texts[i] for i in perm]
    shuffled_labels = [combined_labels[i] for i in perm]
    
    return shuffled_texts, shuffled_labels

def main():
    # 1. Collect Train Pool
    train_texts, train_labels = collect_balanced_split("train", TRAIN_SAMPLE_COUNT, SEED)
    print(f"Train pool: {len(train_texts):,} items (Neg: {train_labels.count(0)}, Pos: {train_labels.count(1)})")
    
    # 2. Collect Untouched Test Benchmark
    test_texts, test_labels = collect_balanced_split("test", TEST_SAMPLE_COUNT, SEED + 1)
    print(f"Test benchmark: {len(test_texts):,} items (Neg: {test_labels.count(0)}, Pos: {test_labels.count(1)})")
    
    # 3. Create Train / Validation Split from Train Pool
    x_train, x_val, y_train, y_val = train_test_split(
        train_texts,
        train_labels,
        test_size=VAL_FRACTION,
        random_state=SEED,
        stratify=train_labels
    )
    
    print(f"Split completed:")
    print(f"  Training Set:   {len(x_train):,} samples (Neg: {y_train.count(0)}, Pos: {y_train.count(1)})")
    print(f"  Validation Set: {len(x_val):,} samples (Neg: {y_val.count(0)}, Pos: {y_val.count(1)})")
    print(f"  Untouched Test: {len(test_texts):,} samples (Neg: {test_labels.count(0)}, Pos: {test_labels.count(1)})")
    
    # 4. Save artifacts
    data_payload = {
        "x_train": x_train,
        "y_train": y_train,
        "x_val": x_val,
        "y_val": y_val,
        "x_test": test_texts,
        "y_test": test_labels,
        "metadata": {
            "dataset_id": DATASET_ID,
            "seed": SEED,
            "train_samples": len(x_train),
            "val_samples": len(x_val),
            "test_samples": len(test_texts),
            "class_distribution": {
                "train": {"0": y_train.count(0), "1": y_train.count(1)},
                "val": {"0": y_val.count(0), "1": y_val.count(1)},
                "test": {"0": test_labels.count(0), "1": test_labels.count(1)},
            }
        }
    }
    
    joblib_path = OUTPUT_DIR / "revio_splits_cache.joblib"
    joblib.dump(data_payload, joblib_path, compress=3)
    print(f"Saved dataset cache to {joblib_path}")
    
    meta_path = OUTPUT_DIR / "split_accounting.json"
    meta_path.write_text(json.dumps(data_payload["metadata"], indent=2), encoding="utf-8")
    print(f"Saved split accounting to {meta_path}")

if __name__ == "__main__":
    main()

