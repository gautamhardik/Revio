<div align="center">

# 🎬 The Screening Room

### Three Critics. One Review. Three Perspectives.

**Compare how Logistic Regression, Bi-LSTM, and Fine-Tuned BERT interpret the same movie review — side by side, in real time.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![HF Spaces](https://img.shields.io/badge/🤗%20Hugging%20Face-Spaces-orange?style=for-the-badge)](https://hardik-25-sentiment-analysis.hf.space/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**[🚀 Live Demo](https://hardik-25-sentiment-analysis.hf.space/)** · **[📊 Results](#-experimental-results)** · **[🏗️ Architecture](#%EF%B8%8F-system-architecture)** · **[🧠 Pipeline](#-machine-learning-pipeline)**

<br>





https://github.com/user-attachments/assets/5c47cc05-40f5-4e9a-ad10-e32d959c6cc8


</div>

<br>

---

## 💡 Why The Screening Room?

Sentiment analysis is a solved problem — until you look closely. Most implementations train one model, report an accuracy number, and call it done. But different architectures **read language fundamentally differently**: a bag-of-words model sees keywords, a recurrent model sees sequence order, and a transformer sees full bidirectional context. When they disagree, that's where the interesting story lives.

Movie reviews make this especially visible. They're packed with mixed sentiment, sarcasm, negation, and contextual reversals — exactly the cases where a single model's confident prediction might be wrong, and a second opinion changes the answer.

**The Screening Room** doesn't just predict sentiment. It runs three independent models in parallel, shows you exactly how each one interpreted the review, surfaces the cases where they disagree, and explains *why* each model made its call.

---

## ✨ Key Features

| | |
|---|---|
| 🎭 **Three Competing Architectures** | Logistic Regression (TF-IDF), Bi-LSTM (sequential), and Fine-Tuned BERT (transformer) — running in isolated sequential inference |
| ⚡ **Real-Time Inference** | All three models respond in ~96ms total (~2ms LR + ~22ms Bi-LSTM + ~72ms BERT) — results appear instantly |
| 🗳️ **Majority Vote Verdict** | Consensus prediction with agreement ratio (e.g. "3/3" or "2/3") and automated human triage flagging |
| 📊 **Confidence Visualization** | Animated progress bars showing each model's certainty score |
| 🧠 **Per-Model Reasoning** | Natural-language explanations of *how* each architecture processed the review |
| 🔍 **LR Explainability Panel** | Top positive and negative word extraction from TF-IDF coefficients — faithful, not fabricated |
| ⏱️ **Latency Reporting** | Per-model inference time shown alongside every prediction |
| 🎟️ **Featured Screenings** | Pre-built sample reviews tagged by category (positive, negative, mixed, sarcasm, negation, complex context) and difficulty |
| 🎬 **Cinema-Themed Design** | Gold accents, ticket-styled inputs, marquee borders — designed to feel like a film screening room |
| 🐳 **Single-Container Deployment** | Nginx + Express + FastAPI managed by Supervisor in one Docker container on Hugging Face Spaces |
| 🗄️ **SQLite Persistence** | Prediction history and model metrics stored via Prisma ORM |
| 🛡️ **Per-Model Fault Isolation** | One model failing doesn't crash the request — the other two still return results |

---

## 🏗️ System Architecture

### End-to-End Request Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    User     │────▶│  Nginx (:7860)    │────▶│  Express (:4000) │
│  (Browser)  │     │  Static + Proxy   │     │  Validation +    │
└─────────────┘     └──────────────────┘     │  Rate Limiting   │
                                              └────────┬────────┘
                                                        │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │   FastAPI ML Service     │
                                          │       (:8000)            │
                                          │  Model-Specific Preproc  │
                                          └────────────┬─────────────┘
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    ▼                   ▼                   ▼
                              ┌──────────┐       ┌──────────┐       ┌──────────┐
                              │Log. Reg. │       │ Bi-LSTM  │       │   BERT   │
                              │ (TF-IDF) │       │          │       │(110M)    │
                              └────┬─────┘       └────┬─────┘       └────┬─────┘
                                   └───────────────────┼───────────────────┘
                                                       ▼
                                             Standardized Response
                                            {label, confidence,
                                             latency, reasoning}
                                                       │
                                                       ▼
                                              Majority Vote + Verdict
                                                       │
                                                       ▼
                                            Frontend renders results
```

### Model Pipeline Architecture

```
   Raw Review        Model-Specific         Fault-Isolated         Standardized
   (Text Input)      Preprocessing          Inference Engines       Response
        │                  │                      │                     │
        ▼                  ▼                      ▼                     ▼
   ┌─────────┐     ┌─────────────┐     ┌─────────────────┐     ┌───────────┐
   │  User   │────▶│  Preprocess │────▶│  LR · LSTM · BERT│────▶│  Verdict  │
   │  Input  │     │  (per model)│     │  (sequential)    │     │  + Triage  │
   └─────────┘     └─────────────┘     └─────────────────┘     └───────────┘
```

| Stage | Role |
|---|---|
| **Nginx** | Serves static frontend, proxies `/api/*` to Express on port 4000 |
| **Express** | Validates input, applies rate limiting, manages sessions, persists to SQLite via Prisma |
| **FastAPI** | Receives preprocessed request, runs model-specific preprocessing, executes inference, returns standardized JSON |
| **LR (TF-IDF)** | Lowercase → expand contractions → strip HTML/URLs → remove special chars → stopword removal (negations preserved) → lemmatize → TF-IDF vectorize |
| **Bi-LSTM** | Lowercase → expand contractions → strip HTML/URLs → tokenize → pad to max_len=300 |
| **BERT** | Strip HTML → normalize whitespace → WordPiece tokenize (max_length=128) |
| **Majority Vote** | Compares labels from all available models, picks the majority, reports agreement ratio |

---

## 🧰 Tech Stack

<table>
<tr>
<td valign="top" width="25%">

**Frontend**
- HTML
- CSS (Cinema Theme)
- JavaScript
- Nginx

</td>
<td valign="top" width="25%">

**Backend**
- Express.js
- Prisma ORM
- SQLite
- Zod · Helmet · CORS

</td>
<td valign="top" width="25%">

**Machine Learning**
- scikit-learn
- TensorFlow / Keras
- PyTorch
- 🤗 Transformers
- NLTK

</td>
<td valign="top" width="25%">

**Deployment**
- FastAPI
- Uvicorn
- Docker
- Supervisor
- 🤗 Hugging Face Spaces

</td>
</tr>
</table>

```
# Python
numpy · pandas · scikit-learn · scipy · nltk
tensorflow · keras · torch · transformers
fastapi · uvicorn · pydantic · joblib

# Node.js
express · prisma · axios · cors · helmet
morgan · zod · express-rate-limit
```

---

## 📊 Dataset

Trained and evaluated on the **IMDb Large Movie Review Dataset** (Maas et al., Stanford AI Lab) — the standard benchmark for binary sentiment classification.

| Split | Samples |
|---|---:|
| Training | 25,000 |
| Testing | 25,000 |
| **Total** | **50,000** |

```
pos/  → 25,000 positive reviews
neg/  → 25,000 negative reviews
```

Balanced classes mean **accuracy, precision, recall, and F1 are all meaningful** — not artifacts of class imbalance.

**Source:** [IMDb Large Movie Review Dataset](https://ai.stanford.edu/~amaas/data/sentiment/) — Andrew L. Maas et al., Stanford AI Lab

---

## 🧠 Machine Learning Pipeline

### Preprocessing

| Model | Steps |
|---|---|
| **LR (TF-IDF)** | Lowercase → expand contractions → strip HTML/URLs → remove special chars → stopword removal (negations preserved) → lemmatize |
| **Bi-LSTM** | Lowercase → expand contractions → strip HTML/URLs → keep alphanumeric + basic punctuation |
| **BERT** | Strip HTML → normalize whitespace (tokenizer handles the rest) |

> ⚠️ **Negation-preserving stopword removal is critical.** Removing "not", "never", "can't" destroys the most important sentiment inversion signals. The preprocessing pipeline explicitly preserves negation words.

### Training

| Model | Features | Epochs | Optimizer | Key Detail |
|---|---|---|---|---|
| Logistic Regression | TF-IDF (50k features) | N/A | LBFGS | Linear classifier, no training epochs |
| Bi-LSTM | Tokenized sequences (max_len=300) | 10 | Adam | 64-unit bidirectional LSTM + dropout |
| BERT | WordPiece tokens (max_length=128) | 3 | AdamW | Fine-tuned with frozen/unfreeze schedule |

### Inference Optimization

| Technique | Impact |
|---|---|
| **Singleton model loading** | Models loaded once at startup — zero per-request load overhead |
| **`@tf.function` compilation** | Bi-LSTM latency dropped from ~1500ms to ~22ms (50–70x improvement) |
| **Model warmup** | Dummy inference at startup forces TensorFlow graph compilation and PyTorch initialization |
| **Per-model try/catch** | One model failing doesn't prevent the other two from returning results |

---

## 📈 Experimental Results

*Independently validated on held-out IMDb test data.*

<div align="center">

| Model | Accuracy | Precision | Recall | F1 | Parameters | Model Size | Inference |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Logistic Regression** | 90.15% | 90.10% | 90.20% | 90.10% | ~50K | **12.37 MB** | **~2 ms** |
| **Bi-LSTM** | 84.67% | 85.00% | 84.50% | 84.70% | **~6.5M+** | **78.0 MB** | ~22 ms |
| **Fine-Tuned BERT** | 91.68% | 93.32% | 89.79% | 91.52% | **~109.5M** | **438.0 MB** | ~72 ms |

> ℹ️ **Reconciliation Notes:** Model sizes match exact Git LFS / on-disk artifacts (sentiment_model.pkl 2.80 MB + 	fidf_vectorizer.pkl 9.57 MB = 12.37 MB total; est_lstm_model.keras 78.0 MB with 50,000x128 embedding matrix yielding ~6.5M+ parameters; model.safetensors 438.0 MB / 437,958,624 bytes). Inference executes sequentially with fault isolation in a single request (~96 ms total latency).

</div>

**Accuracy vs. Latency Trade-off**

```
Accuracy (%)
 92 |                                    * BERT (91.68%, 72ms)
 90 |  * LR (90.15%, 2ms)
 88 |
 86 |
 84 |          * Bi-LSTM (84.67%, 22ms)
    +----------+----------+----------+------
               0         25         50        75
                        Latency (ms)
```

---

## ✅ Why These Results Are Trustworthy

High numbers invite skepticism — rightfully so. Here's why this isn't overfitting:

- **No data leakage** — predefined train/test splits were strictly respected; test data was never seen during training or model selection.
- **Balanced dataset** — equal class representation means accuracy, precision, recall, and F1 all reflect true performance.
- **Standard benchmark** — IMDb is the most widely cited dataset for binary sentiment classification, enabling direct comparison with published results.
- **Transfer learning, not memorization** — BERT's performance is driven by pretrained contextual representations, not example-level memorization.
- **Consistent cross-model agreement** — LR and BERT both reaching ~90%+ through fundamentally different approaches validates the dataset and evaluation methodology.

---

## 🔍 Key Insights

**Why Logistic Regression performs so well:** movie reviews are rich in explicit sentiment-laden keywords ("amazing," "terrible," "masterpiece"), which TF-IDF captures directly. Since much of the sentiment signal in this dataset is lexical rather than contextual, a bag-of-words model is surprisingly competitive.

**Why BERT wins where it wins:** BERT's advantage concentrates on reviews with negation ("I can't say I disliked it"), sarcasm, and mixed sentiment — cases where isolated keyword weight is actively misleading and contextual understanding changes the answer.

**Why Bi-LSTM underperforms both:** on this dataset, the sequential complexity of LSTM doesn't justify its computational cost. LR's bag-of-words is fast and effective; BERT's transformer attention captures context better. LSTM falls in an uncomfortable middle ground.

---

## 🖥️ Web Application

### Landing Page

Cinema-themed ticket-style input with "Featured Screenings" sample reviews tagged by category (positive, negative, mixed, sarcasm, negation, complex context) and difficulty level.

### Featured Screenings

Eight pre-built sample reviews spanning all sentiment categories — click "Use This Review" to load any sample into the textarea instantly.

<img src="assets/landing-page.png" alt="Featured Screenings sample review cards" width="100%">

### Prediction Results

Overall verdict banner with majority vote and agreement ratio; three critic cards with per-model prediction, confidence bar, and latency; LR explainability panel with top positive/negative words; natural-language reasoning per model.

<img src="assets/prediction-results.png" alt="Prediction results with three-model comparison" width="100%">

### A Real Prediction Example

> *"The movie wasn't bad, but it wasn't good either. I can't say I disliked it, but I also can't say I liked it."*

All three models correctly classified this as negative (3/3 agreement), but with very different confidence — Logistic Regression (83.8%), Bi-LSTM (71.1%), and BERT (98.1%). The LR explainability panel surfaces the key words driving its decision: "cannot say", "liked" as positive cues versus "either", "movie", "bad" as negative cues.

<img src="assets/model-disagreement-example.png" alt="Three-model comparison with confidence scores and explainability" width="100%">

---

## 📁 Repository Structure

```
sentiment-analysis/
│
├── frontend/                    # Static frontend (HTML/CSS/JS)
│   ├── index.html               # Main analysis page
│   ├── inside.html              # Model details & project info
│   ├── style.css                # Cinema-themed styling
│   ├── app.js                   # Analysis UI + Featured Screenings
│   ├── inside.js                # Inside page logic
│   └── film_reel.png            # Logo asset
│
├── backend/                     # Express.js API Gateway
│   ├── src/
│   │   ├── server.js            # Entry point
│   │   ├── config/index.js      # Environment config
│   │   ├── routes/v1.routes.js  # Route definitions
│   │   ├── controllers/
│   │   │   └── predict.controller.js
│   │   ├── services/
│   │   │   ├── mlService.js     # FastAPI client (axios)
│   │   │   └── dbService.js     # Prisma DB operations
│   │   └── middleware/
│   │       ├── validation.js    # Zod validation
│   │       ├── rateLimiter.js   # Rate limiting
│   │       └── errorHandler.js  # Error handling
│   └── prisma/
│       ├── schema.prisma        # Database schema
│       └── seed.js              # Model metrics seed
│
├── ml_service/                  # FastAPI ML Inference
│   ├── main.py                  # FastAPI entry point
│   └── app/
│       ├── config.py            # Model paths & settings
│       ├── api/routes.py        # /predict, /health, /models
│       ├── schemas/
│       │   └── prediction.py    # Pydantic request/response
│       ├── services/
│       │   ├── model_loader.py  # Singleton model manager
│       │   ├── predictor.py     # Per-model prediction
│       │   └── explainer.py     # Reasoning engine
│       └── utils/
│           └── preprocessing.py # Text preprocessing
│
├── models_ml/                   # Logistic Regression artifacts
│   ├── sentiment_model.pkl
│   └── tfidf_vectorizer.pkl
│
├── models_lstm/                 # Bi-LSTM artifacts
│   └── best_lstm_model.keras
│
├── models_bert/                 # BERT artifacts
│   └── tuned/
│       ├── model.safetensors
│       ├── config.json
│       ├── tokenizer.json
│       └── threshold.pkl
│
├── data/                        # Shared preprocessing artifacts
│   ├── tokenizer.pkl
│   └── config.pkl
│
├── assets/                      # README screenshots
├── Dockerfile                   # Single-container build
├── supervisord.conf             # Process manager
├── nginx.conf                   # Reverse proxy
├── hf_start.sh                  # HF Spaces entrypoint
├── docker-compose.yml           # Local development
├── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

> **Two separate environments — don't mix them up:**
> - **Local development** (`docker-compose.yml`): Frontend, Express, FastAPI, and **PostgreSQL** as separate containers.
> - **Production (Hugging Face Spaces)**: single Docker container with **SQLite** for persistence.

### Local Development (Docker Compose)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:4000 |
| ML Service | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

### Local Development (Without Docker)

```bash
pip install -r requirements.txt
cd backend && npm install && cd ..

cd ml_service && uvicorn main:app --host 0.0.0.0 --port 8000 &
cd backend && npm start &
npx serve frontend -p 8080
```

### Deployment Topology & Docker

> ℹ️ **Production vs Local Compose**:
> - **Verified Production**: The root Dockerfile + supervisord.conf (exposed on port 7860) is the verified production single-container multi-process build powering the live Hugging Face Space.
> - **Development Template**: docker-compose.yml provides an experimental multi-container development configuration (Frontend :8080, Backend :4000, ML Service :8000, PostgreSQL :5432).

### Hugging Face Spaces (Production)

Live at **[hardik-25-sentiment-analysis.hf.space](https://hardik-25-sentiment-analysis.hf.space/)** — single Docker container, Supervisor-managed, exposed on port 7860.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/predict` | Analyze a movie review |
| `GET` | `/api/v1/health` | System health check |
| `GET` | `/api/v1/models` | List available models |
| `GET` | `/api/v1/model_metrics` | Model performance metrics |
| `GET` | `/api/v1/history/:sessionId` | Prediction history |

```bash
curl -X POST http://localhost:4000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was absolutely brilliant!", "models": ["lr", "lstm", "bert"]}'
```

---

## 🔧 Engineering Decisions

**Why FastAPI for the ML service?** Native async support and Pydantic validation fit naturally with a Python ML stack, without a translation layer between the web framework and NumPy/PyTorch/TensorFlow.

**Why a separate Express gateway?** Separating validation, rate limiting, session handling, and persistence from inference keeps the ML service focused purely on prediction and lets either layer scale or be replaced independently.

**Why SQLite + Prisma in production, but PostgreSQL locally?** HF Spaces storage is ephemeral and doesn't include a managed database service, so SQLite gives zero-configuration persistence there. Locally, PostgreSQL exercises the same schema against a real relational database. Prisma's schema stays the same — only the engine changes.

**Why three models instead of the best one?** The point isn't a leaderboard winner — it's showing *how* different architectures read the same text differently, which is a more honest and more interesting engineering story than reporting a single number.

**Why does LR's explainability panel differ from LSTM's and BERT's?** TF-IDF coefficients are a real, faithful measure of feature importance, so LR shows word-level attribution. Bi-LSTM and BERT don't have an equivalently cheap, faithful attribution method by default (raw attention weights are not a validated importance measure), so their panels explain *how* the architecture processes text instead of fabricating word-level scores.

**Why did Bi-LSTM's latency drop from 1500ms+ to ~22ms?** Keras's high-level `.predict()` rebuilds parts of the computation graph on every call. Wrapping the forward pass in `@tf.function(reduce_retracing=True)` and invoking the model directly precompiles a static graph, cutting per-request latency by roughly 50–70x.

**Why Supervisor?** HF Spaces exposes a single port. Supervisor runs Nginx, Express, and FastAPI as three managed processes in one container, each with independent restart and log streams.

---

## ⚠️ Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| No GPU on HF Spaces | BERT inference is CPU-bound (~72ms) | Singleton loading + threshold tuned for CPU |
| SQLite is ephemeral | Data resets on Space restart | Metrics re-seeded at build time; history is session-scoped |
| Single-container deployment | No horizontal scaling | Service boundaries support splitting later |
| Binary classification only | No neutral/multi-class | Listed under Future Roadmap |
| English-only | No multilingual support | Listed under Future Roadmap |

---

## 🔮 Future Roadmap

| Priority | Feature | Status |
|---|---|---|
| 🟢 High | Multilingual sentiment analysis | Planned |
| 🟢 High | Batch analysis (multiple reviews) | Planned |
| 🟡 Medium | Additional transformers (RoBERTa, DistilBERT) | Planned |
| 🟡 Medium | Mobile-responsive layout | Planned |
| 🔵 Low | Validated token-level attribution (Integrated Gradients) | Research |
| 🔵 Low | Real-time streaming predictions | Research |

---

## 🙏 Acknowledgements

- [IMDb Large Movie Review Dataset](https://ai.stanford.edu/~amaas/data/sentiment/) — Andrew L. Maas et al., Stanford AI Lab
- [Hugging Face](https://huggingface.co/) — Transformers library and Spaces hosting
- [FastAPI](https://fastapi.tiangolo.com/) · [Express.js](https://expressjs.com/) · [Prisma](https://www.prisma.io/)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

### 🎬 The Screening Room

*Three Critics. One Review. Three Perspectives.*

**[Live Demo](https://hardik-25-sentiment-analysis.hf.space/)**

If this project was useful or interesting, consider ⭐ starring the repo.

</div>
