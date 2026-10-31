# Implementation notes and data integrity

## Known project context (verify against the local working tree)

- The existing project is called The Screening Room and performs movie-review sentiment analysis.
- Known stack: Vanilla HTML/CSS/JavaScript frontend, Express API gateway, FastAPI model service, model artifacts for Logistic Regression, Bi-LSTM and BERT, and Prisma/SQLite in the deployed configuration; PostgreSQL was an experimental configuration.
- The user has reported local changes to FastAPI prediction handling: synchronous prediction function, a Mixed / No Consensus tie result, `needs_human_review`, server-side traceback logging with sanitized client errors. The public GitHub `main` branch previously appeared behind those local changes. Verify the local implementation; do not assume these changes are in the repository.
- The user has reported a Yelp business-review experiment using a 2,500-row held-out test set. Verify the result CSV/JSON and model artifacts before displaying numbers.

## Benchmarks reported by the user

### Yelp Polarity held-out test (2,500 reviews)

| Model | Accuracy | Positive F1 | Negative recall | ROC-AUC |
|---|---:|---:|---:|---:|
| IMDb-trained Logistic Regression on Yelp | 85.84% | 85.82% | 83.14% | 0.9369 |
| Yelp word TF-IDF LR | 91.64% | 91.22% | 93.19% | 0.9775 |
| Yelp word + character TF-IDF LR | 92.44% | 92.09% | 93.66% | 0.9795 |

Reported fit times: 3.7 s for Yelp word LR and 14.7 s for word+character LR. Reported artifacts: approximately 945 KB and 1.17 MB. Confirm measurement environment and files before publication.

### IMDb movie-review benchmark

- Logistic Regression + TF-IDF: 90.15% accuracy.
- Bi-LSTM: 84.67% accuracy.
- Fine-tuned BERT: 91.68% accuracy.

These are separate experiments and should not be mixed with the Yelp test results.

## Feature-status policy

Before implementation, inspect the local project and classify every capability as:

- **Existing:** verified in source and testable end-to-end.
- **Partial:** present in UI or code but not fully wired/persisted.
- **Planned:** design-only; not yet implemented.

Likely capabilities requiring special verification:

- CSV batch upload, column mapping and persistent run history.
- Review inbox backed by a database.
- Assignment and review-state persistence.
- Topic/theme extraction and trend aggregation.
- Explainability/evidence spans for each model.
- Calibrated confidence and human-review threshold.
- Multi-user workspace, notifications, integrations and data retention.

A design can include a planned feature only if the UI clearly communicates its status. Do not style planned capabilities as if they are already live.
