# Revio Business-Review Domain Experiment

A small, isolated experiment for **The Screening Room** repository and Cynbit's assessment. It compares:

1. The existing IMDb-trained TF-IDF + Logistic Regression model, if model artifacts are available locally.
2. A Logistic Regression model trained on a small Yelp Polarity sample using word unigram/bigram TF-IDF.
3. A second Yelp-trained Logistic Regression model combining word n-grams with character n-grams.

The point is to measure the **movie-review-to-business-review domain gap** and test a lightweight adaptation. It does not edit the existing frontend, backend, model artifacts, or live deployment. It deliberately does not promise any fixed accuracy improvement.

## Data

The experiment uses [`fancyzhx/yelp_polarity`](https://huggingface.co/datasets/fancyzhx/yelp_polarity), a public benchmark with `text` and binary `label` fields (0 = negative, 1 = positive). It streams a randomized sample instead of downloading all records. It samples training rows from the dataset's `train` split, makes a stratified validation split from that sample, and samples final reporting rows from the dataset's `test` split.

**Licensing note:** review the dataset card and applicable Yelp dataset terms before any commercial reuse. For this hiring assessment, describe it as public benchmark data, not Cynbit customer data.

## Setup

Run from the root of the cloned repository:

```bash
git lfs install
git lfs pull
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r experiments/revio_business_review_experiment/requirements.txt
```

If this folder is being used standalone, run from this folder and provide the cloned repository path with `--repo-root`.

## Run

From the repository root:

```bash
python experiments/revio_business_review_experiment/train_and_compare.py \
  --repo-root . \
  --train-size 10000 \
  --test-size 5000
```

For a quick run that skips the old IMDb-trained model:

```bash
python experiments/revio_business_review_experiment/train_and_compare.py --skip-existing --train-size 3000 --test-size 1000
```

Outputs are written under `experiments/revio_business_review_experiment/artifacts/`:

- `metrics.csv` and `metrics.json`
- `yelp_word_lr.joblib`
- `yelp_word_char_lr.joblib`

You may choose settings using the validation results. Do not tune on the test sample and then present it as an untouched final test.

## Metrics

- Accuracy
- Positive-class precision, recall and F1
- Negative-class recall (important when monitoring complaints)
- ROC-AUC
- Confusion-matrix counts (TN, FP, FN, TP)
- Batch inference time per review (throughput measurement; **not** single-request production latency)

## Important implementation details

- The old model is scored with the repository's `preprocess_for_tfidf` when the model and vectorizer artifacts are real Git LFS files. If the files are Git LFS pointers, missing, or incompatible, the script records a skip/error and still runs the new-domain experiment.
- The existing IMDb model uses the original movie-review training domain. Yelp results are reported separately and should not be conflated with the original IMDb benchmark scores.
- Character n-grams can be useful for misspellings and spelling variants, but they add memory and training cost. The validation results should determine whether they are worth keeping.
- No `predictor.py` or API integration changes are made. Before integrating a model, check preprocessing parity, class-label mapping, persisted artifact compatibility, and regression tests.
- A Yelp polarity model predicts positive/negative polarity only. It does not identify urgency, infer a complaint category, generate replies, or prove performance on property-management records.

## Troubleshooting

- If dataset download fails, check network access to Hugging Face and rerun.
- If loading the current repository model fails, run `git lfs pull` and verify `models_ml/sentiment_model.pkl` and `models_ml/tfidf_vectorizer.pkl` are actual artifacts rather than small Git LFS pointer text files.
- If training is too slow or memory-intensive, reduce `--train-size` to `3000` and `--test-size` to `1000` for a smoke experiment. Do not present a smoke run as a definitive benchmark.
