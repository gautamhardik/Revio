import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "train_and_compare.py"
spec = importlib.util.spec_from_file_location("revio_experiment", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def test_compute_metrics_binary_labels_and_negative_recall():
    row = module.compute_metrics(
        model_name="test",
        split="unit",
        y_true=[0, 0, 1, 1],
        probabilities=[0.1, 0.7, 0.8, 0.2],
    )
    assert row["n_samples"] == 4
    assert row["tn"] == 1
    assert row["fp"] == 1
    assert row["fn"] == 1
    assert row["tp"] == 1
    assert row["accuracy"] == pytest.approx(0.5)
    assert row["negative_recall"] == pytest.approx(0.5)


def test_compute_metrics_rejects_bad_probability():
    with pytest.raises(ValueError, match="between 0 and 1"):
        module.compute_metrics(
            model_name="test", split="unit", y_true=[0, 1], probabilities=[-0.1, 0.7]
        )


def test_compute_metrics_rejects_mismatched_lengths():
    with pytest.raises(ValueError, match="same number of rows"):
        module.compute_metrics(
            model_name="test", split="unit", y_true=[0, 1], probabilities=[0.2]
        )
