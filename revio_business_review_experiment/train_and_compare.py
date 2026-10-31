"""Compare the IMDb-trained LR baseline with Yelp-trained TF-IDF baselines.

This experiment is intentionally isolated from the live Screening Room app.
It loads a small streaming subset of the public Yelp Polarity dataset, trains
simple linear models, evaluates on a held-out slice of the dataset's official
`test` split, and optionally scores the repository's existing IMDb LR model.

Example (run from the cloned Sentiment-Analysis repository root):
    python experiments/revio_business_review_experiment/train_and_compare.py \
        --repo-root . --train-size 10000 --test-size 5000

If running this standalone, pass --repo-root to the cloned repository, or use
--skip-existing to train/evaluate only the new Yelp-domain models.
"""
from __future__ import annotations

import argparse
import csv
import itertools
import json
import sys
import time
from pathlib import Path
from typing import Any, Iterable

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

DATASET_ID = "fancyzhx/yelp_polarity"


def collect_stream_rows(split: str, count: int, seed: int) -> tuple[list[str], list[int]]:
    """Collect a deterministic sample, using local pre-downloaded parquet if available or streaming from HF."""
    local_parquet = Path("test_sample.parquet")
    if local_parquet.is_file():
        try:
            import pyarrow.parquet as pq
            table = pq.read_table(local_parquet)
            # Use distinct slices for train and test if from the same 38,000-row parquet
            rng = np.random.RandomState(seed)
            total_rows = len(table)
            indices = np.arange(total_rows)
            rng.shuffle(indices)
            
            if split == "train":
                selected_indices = indices[:min(count, total_rows // 2)]
            else:
                selected_indices = indices[total_rows // 2 : total_rows // 2 + min(count, total_rows // 2)]
                
            sampled_table = table.take(selected_indices)
            texts = [t.as_py().strip() for t in sampled_table["text"]]
            labels = [int(l.as_py()) for l in sampled_table["label"]]
            return texts, labels
        except Exception as e:
            print(f"Notice: Local parquet load failed ({e}), falling back to HF streaming...")

    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise RuntimeError(
            "Missing package 'datasets'. Install this experiment's requirements.txt first."
        ) from exc

    if count < 1:
        raise ValueError("Sample count must be >= 1.")

    dataset = load_dataset(DATASET_ID, split=split, streaming=True)
    buffer_size = min(100_000, max(10_000, count * 10))
    dataset = dataset.shuffle(seed=seed, buffer_size=buffer_size)

    texts: list[str] = []
    labels: list[int] = []
    for row in itertools.islice(iter(dataset), count):
        text = row.get("text")
        label = row.get("label")
        if not isinstance(text, str) or not text.strip():
            continue
        try:
            label_int = int(label)
        except (TypeError, ValueError):
            continue
        if label_int not in (0, 1):
            raise ValueError(
                f"Unexpected label {label_int!r}. Expected Yelp Polarity labels 0=negative, 1=positive."
            )
        texts.append(text.strip())
        labels.append(label_int)

    if not texts:
        raise RuntimeError(f"No usable rows were read from split={split!r} of {DATASET_ID!r}.")
    if len(set(labels)) != 2:
        raise RuntimeError(f"Sample from split={split!r} contains only one class; try a larger sample.")
    return texts, labels


def make_word_model() -> Pipeline:
    """Plain word TF-IDF baseline; lightweight and easy to explain."""
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=50_000,
                    min_df=2,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "classifier",
                LogisticRegression(C=4.0, max_iter=1_000, solver="liblinear", random_state=42),
            ),
        ]
    )


def make_word_char_model() -> Pipeline:
    """Word + character n-gram features; can capture typos and word variants."""
    features = FeatureUnion(
        transformer_list=[
            (
                "word",
                TfidfVectorizer(
                    ngram_range=(1, 3),
                    max_features=40_000,
                    min_df=2,
                    max_df=0.95,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    max_features=25_000,
                    min_df=3,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
        ]
    )
    return Pipeline(
        steps=[
            ("features", features),
            (
                "classifier",
                LogisticRegression(C=4.0, max_iter=1_000, solver="liblinear", random_state=42),
            ),
        ]
    )


def compute_metrics(
    *, model_name: str, split: str, y_true: Iterable[int], probabilities: Iterable[float],
    inference_ms: float | None = None,
) -> dict[str, Any]:
    """Return stable binary sentiment metrics; label 1 is positive, label 0 negative."""
    y_true_arr = np.asarray(list(y_true), dtype=int)
    probs_arr = np.asarray(list(probabilities), dtype=float)
    if y_true_arr.shape[0] != probs_arr.shape[0]:
        raise ValueError("y_true and probabilities must have the same number of rows.")
    if y_true_arr.size == 0:
        raise ValueError("Cannot score an empty split.")
    if np.any(~np.isfinite(probs_arr)) or np.any((probs_arr < 0) | (probs_arr > 1)):
        raise ValueError("Probabilities must be finite values between 0 and 1.")

    y_pred = (probs_arr >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true_arr, y_pred, labels=[0, 1]).ravel()
    try:
        auc = float(roc_auc_score(y_true_arr, probs_arr)) if len(np.unique(y_true_arr)) == 2 else None
    except ValueError:
        auc = None

    n_negative = int((y_true_arr == 0).sum())
    negative_recall = float(tn / n_negative) if n_negative else 0.0
    return {
        "model": model_name,
        "split": split,
        "n_samples": int(y_true_arr.size),
        "accuracy": float(accuracy_score(y_true_arr, y_pred)),
        "positive_precision": float(precision_score(y_true_arr, y_pred, pos_label=1, zero_division=0)),
        "positive_recall": float(recall_score(y_true_arr, y_pred, pos_label=1, zero_division=0)),
        "positive_f1": float(f1_score(y_true_arr, y_pred, pos_label=1, zero_division=0)),
        "negative_recall": negative_recall,
        "roc_auc": auc,
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        # This is measured over a batch call, not a single interactive request.
        "batch_inference_ms_per_review": (
            float(inference_ms / y_true_arr.size) if inference_ms is not None else None
        ),
    }


def predict_probabilities(model: Any, texts: list[str]) -> tuple[np.ndarray, float]:
    start = time.perf_counter()
    probabilities = model.predict_proba(texts)[:, 1]
    elapsed_ms = (time.perf_counter() - start) * 1000
    return probabilities, elapsed_ms


def try_score_existing_imdb_model(
    repo_root: Path, test_texts: list[str], test_labels: list[int]
) -> tuple[dict[str, Any] | None, str]:
    """Score existing IMDb LR artifacts if real Git LFS files are present."""
    model_path = repo_root / "models_ml" / "sentiment_model.pkl"
    vectorizer_path = repo_root / "models_ml" / "tfidf_vectorizer.pkl"
    if not model_path.is_file() or not vectorizer_path.is_file():
        return None, "Skipped existing IMDb LR model: model or vectorizer artifact not found."

    for path in (model_path, vectorizer_path):
        try:
            if path.read_text(errors="ignore").startswith("version https://git-lfs.github.com/spec/v1"):
                return None, (
                    "Skipped existing IMDb LR model: Git LFS pointer detected. Run `git lfs pull` "
                    "inside the cloned repository to download model artifacts."
                )
        except OSError:
            pass

    try:
        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)
        ml_service_dir = repo_root / "ml_service"
        if not ml_service_dir.is_dir():
            return None, "Skipped existing IMDb LR model: ml_service directory not found for exact preprocessing."
        sys.path.insert(0, str(ml_service_dir))
        try:
            from app.utils.preprocessing import preprocess_for_tfidf
        finally:
            # Keep repo import path scoped to avoid changing unrelated module resolution.
            try:
                sys.path.remove(str(ml_service_dir))
            except ValueError:
                pass

        cleaned = [preprocess_for_tfidf(text) for text in test_texts]
        matrix = vectorizer.transform(cleaned)
        probs_all = model.predict_proba(matrix)
        classes = list(model.classes_)
        if 1 not in classes:
            return None, f"Skipped existing IMDb LR model: expected positive class label 1, found {classes!r}."
        probs = probs_all[:, classes.index(1)]
        return compute_metrics(
            model_name="Existing IMDb-trained Logistic Regression",
            split="yelp_official_test_sample",
            y_true=test_labels,
            probabilities=probs,
        ), "Scored existing IMDb-trained LR model on the same Yelp test sample."
    except Exception as exc:  # Keep new-domain experiment running if old artifact cannot load.
        return None, f"Could not evaluate existing IMDb LR model ({type(exc).__name__}: {exc})."


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    columns = list(dict.fromkeys(key for row in rows for key in row.keys()))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def run(args: argparse.Namespace) -> int:
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    repo_root = Path(args.repo_root).resolve()

    print(f"Loading {args.train_size:,} shuffled training examples from {DATASET_ID}...")
    texts, labels = collect_stream_rows("train", args.train_size, args.seed)
    x_train, x_val, y_train, y_val = train_test_split(
        texts,
        labels,
        test_size=args.validation_fraction,
        random_state=args.seed,
        stratify=labels,
    )
    print(f"Training: {len(x_train):,}; validation: {len(x_val):,}")

    print(f"Loading {args.test_size:,} shuffled examples from the official test split...")
    x_test, y_test = collect_stream_rows("test", args.test_size, args.seed + 1)

    models = [
        ("Yelp-trained word TF-IDF + Logistic Regression", make_word_model(), "yelp_word_lr.joblib"),
        ("Yelp-trained word + char TF-IDF + Logistic Regression", make_word_char_model(), "yelp_word_char_lr.joblib"),
    ]
    results: list[dict[str, Any]] = []
    predictions_payload: dict[str, Any] = {
        "dataset": DATASET_ID,
        "label_mapping": {"0": "negative", "1": "positive"},
        "seed": args.seed,
        "train_rows_before_validation_split": len(texts),
        "train_rows": len(x_train),
        "validation_rows": len(x_val),
        "official_test_rows_sampled": len(x_test),
        "models": {},
    }

    for model_name, model, artifact_name in models:
        print(f"\nFitting {model_name}...")
        fit_start = time.perf_counter()
        model.fit(x_train, y_train)
        fit_seconds = time.perf_counter() - fit_start
        print(f"Fit completed in {fit_seconds:.1f} seconds.")

        val_probs, val_ms = predict_probabilities(model, x_val)
        val_row = compute_metrics(
            model_name=model_name,
            split="validation",
            y_true=y_val,
            probabilities=val_probs,
            inference_ms=val_ms,
        )
        val_row["fit_seconds"] = round(fit_seconds, 3)
        results.append(val_row)

        test_probs, test_ms = predict_probabilities(model, x_test)
        test_row = compute_metrics(
            model_name=model_name,
            split="yelp_official_test_sample",
            y_true=y_test,
            probabilities=test_probs,
            inference_ms=test_ms,
        )
        test_row["fit_seconds"] = round(fit_seconds, 3)
        results.append(test_row)
        artifact_path = output_dir / artifact_name
        joblib.dump(model, artifact_path, compress=3)
        print(
            f"  validation accuracy={val_row['accuracy']:.4f}, F1={val_row['positive_f1']:.4f}; "
            f"test accuracy={test_row['accuracy']:.4f}, F1={test_row['positive_f1']:.4f}"
        )
        predictions_payload["models"][artifact_name] = {
            "model_name": model_name,
            "artifact": artifact_name,
            "validation": val_row,
            "test": test_row,
        }

    if not args.skip_existing:
        print("\nChecking the existing IMDb-trained Logistic Regression artifacts...")
        old_row, status = try_score_existing_imdb_model(repo_root, x_test, y_test)
        print(status)
        predictions_payload["existing_imdb_model_status"] = status
        if old_row is not None:
            results.append(old_row)
            predictions_payload["models"]["existing_imdb_lr"] = {"test": old_row}
    else:
        predictions_payload["existing_imdb_model_status"] = "Skipped by --skip-existing."

    csv_path = output_dir / "metrics.csv"
    json_path = output_dir / "metrics.json"
    write_csv(csv_path, results)
    json_path.write_text(json.dumps(predictions_payload, indent=2), encoding="utf-8")

    print("\nExperiment complete.")
    print(f"Metrics CSV: {csv_path}")
    print(f"Metrics JSON: {json_path}")
    print(f"Model artifacts: {output_dir}")
    print("Choose any settings using validation results only; treat the test sample as final reporting data.")
    print("Do not plug a Yelp-trained model into the live app until preprocessing compatibility and regression tests pass.")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="Path to cloned Sentiment-Analysis repository root.")
    parser.add_argument("--output-dir", default="experiments/revio_business_review_experiment/artifacts")
    parser.add_argument("--train-size", type=int, default=10_000, help="Number of streaming Yelp train rows to sample.")
    parser.add_argument("--test-size", type=int, default=5_000, help="Number of streaming Yelp test rows to sample.")
    parser.add_argument("--validation-fraction", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-existing", action="store_true", help="Do not try to load the existing IMDb LR model artifacts.")
    args = parser.parse_args(argv)
    if args.train_size < 100:
        parser.error("--train-size must be at least 100 to support stratified train/validation splitting.")
    if args.test_size < 100:
        parser.error("--test-size must be at least 100 for a useful evaluation sample.")
    if not 0.05 <= args.validation_fraction <= 0.4:
        parser.error("--validation-fraction must be between 0.05 and 0.4.")
    return args


if __name__ == "__main__":
    try:
        raise SystemExit(run(parse_args()))
    except KeyboardInterrupt:
        print("Interrupted; no live application files were changed.", file=sys.stderr)
        raise SystemExit(130)
