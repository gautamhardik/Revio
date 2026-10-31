<div align="center">

# Revio — Enterprise Review Intelligence & Automated Operational Triage Engine

### Risk-Gated Sentiment Analysis, Explainable Feature Attribution, and Serverless Triage Architecture for Hospitality (Revio) and Residential Property Operations (TenantEase)

[![Live Web Application](https://img.shields.io/badge/Production%20Deployment-Vercel%20Live-black?style=for-the-badge&logo=vercel)](https://revio-taupe.vercel.app)
[![API Health Check](https://img.shields.io/badge/API%20Health-HTTP%20200-brightgreen?style=for-the-badge)](https://revio-taupe.vercel.app/api/v1/health)
[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Tests](https://img.shields.io/badge/Automated%20Tests-47%2F47%20Passed-success?style=for-the-badge)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

**[Production Web App](https://revio-taupe.vercel.app)** · **[Live API Health](https://revio-taupe.vercel.app/api/v1/health)** · **[GitHub Repository](https://github.com/gautamhardik/Revio)** · **[Assessment Deliverables](#cynbit-assessment-deliverables)**

</div>

<br>

---

## Executive Overview

**Revio** is an enterprise customer feedback intelligence and automated triage engine engineered for multi-location hospitality operations (**Revio**) and residential property management (**TenantEase**).

Organizations managing thousands of monthly reviews, guest surveys, and tenant maintenance tickets face an unsustainable dilemma:
- **Manual review triage** is slow, expensive (~$4.50/ticket), and leads to operational fatigue and delayed response times (18–24 hours).
- **Naive single-model AI automation** creates severe commercial and PR liabilities by misclassifying sarcastic complaints (*"Loved waiting two hours in the snow for cold pizza!"*) and publishing inappropriate canned thank-you messages.

Revio resolves this dilemma through a **risk-gated operational triage architecture**:
1. **Automated Praise Handling:** High-confidence positive reviews ($P > 0.60$) are auto-approved as low priority, eliminating routine clerical burden.
2. **Ambiguity Corridor Isolation:** Reviews in the statistical uncertainty corridor ($0.40 \le P \le 0.60$) are automatically quarantined into a dedicated human review queue.
3. **Severe Operational Defect Escalation:** Low-probability scores ($P < 0.40$) immediately trigger priority defect tags (*Maintenance & Repairs*, *Cleanliness & Hygiene*, *Billing Issues*) and alert supervisory staff.
4. **Domain Safeguard Boundary Router:** Feedback containing out-of-domain signals (telecom, crypto, auto mechanics) is quarantined for human inspection.

---

## Cynbit Assessment Deliverables

This repository contains the complete implementation and formal documentation for all three deliverables required by the Cynbit Technical Assessment:

| Deliverable | Executive PDF Document | Source Markdown | Description |
|---|---|---|---|
| **Deliverable 1: AI Opportunity Report** | [docs/AI_OPPORTUNITY_REPORT.pdf](docs/AI_OPPORTUNITY_REPORT.pdf) | [docs/AI_OPPORTUNITY_REPORT.md](docs/AI_OPPORTUNITY_REPORT.md) | Business problem analysis, risk-gated triage model, quantitative ROI model (75.5% triage cost reduction, $13,600 monthly net savings on 4,000 reviews, 90% latency reduction, 18% tenant churn reduction), product workflows, and 12-week enterprise rollout roadmap. |
| **Deliverable 2: Proof of Concept (PoC) Report** | [docs/PROOF_OF_CONCEPT_POC_REPORT.pdf](docs/PROOF_OF_CONCEPT_POC_REPORT.pdf) | [docs/PROOF_OF_CONCEPT_POC_REPORT.md](docs/PROOF_OF_CONCEPT_POC_REPORT.md) | Live cloud production URL, public code repository, comprehensive 8-screen SaaS UI walkthrough, verified 100-review and 22-review benchmark datasets, local execution commands, and automated Playwright user journey test verification. |
| **Deliverable 3: Technical Approach Report** | [docs/TECHNICAL_APPROACH_REPORT.pdf](docs/TECHNICAL_APPROACH_REPORT.pdf) | [docs/TECHNICAL_APPROACH_REPORT.md](docs/TECHNICAL_APPROACH_REPORT.md) | In-domain Yelp-tuned Word + Character N-Gram Logistic Regression architecture ($1.16$ MB footprint, $+10.52\%$ negative recall over IMDb baseline), mathematical formulation ($\sigma(z)$, $T=0.55$, exact linear attribution $X_j \cdot \beta_j$), 4-tier triage precedence hierarchy, Vercel serverless systems engineering ($<130$ MB runtime, $<10$ ms latency), and 47/47 passing tests. |

---

## Production Verification & Live Access

| Environment / Artifact | Endpoint / Repository | Status |
|---|---|:---:|
| **Live Production Web Application** | [https://revio-taupe.vercel.app](https://revio-taupe.vercel.app) | **LIVE / HTTP 200** |
| **Production Serverless API Health** | [https://revio-taupe.vercel.app/api/v1/health](https://revio-taupe.vercel.app/api/v1/health) | **HTTP 200 (`status: healthy`)** |
| **Public Source Repository** | [https://github.com/gautamhardik/Revio](https://github.com/gautamhardik/Revio) | **ACTIVE (Branch: main)** |
| **Active Production Candidate Model** | `yelp_word_char_lr_candidate.joblib` ($1.16$ MB, $T=0.55$) | **VERIFIED IN MEMORY** |
| **Operational Champion Fallback** | `yelp_word_char_lr.joblib` ($1.11$ MB, $T=0.48$) | **PRESERVED** |
| **Automated Test Suite Coverage** | 47 tests across API, Candidate Audit, Gate & Architecture | **100% PASS (47/47)** |
| **Browser User Journey Verification** | Automated Playwright Chromium test suite targeting live URL | **100% PASS (5/5 Steps)** |

---

## Core Capabilities & Feature Matrix

```
+---------------------------------------------------------------------------------------------------+
|                                  REVIO OPERATIONAL TRIAGE PIPELINE                                |
|                                                                                                   |
|   Incoming Unstructured Reviews / Tenant Maintenance Tickets                                      |
|                                │                                                                  |
|                                ▼                                                                  |
|   ┌─────────────────────────────────────────────────────────────┐                                 |
|   │ RFC-4180 Ingestion Gate (CSV Auto-Map & Noise Filter <= 3ch)│                                 |
|   └────────────────────────────┬────────────────────────────────┘                                 |
|                                │                                                                  |
|                                ▼                                                                  |
|   ┌─────────────────────────────────────────────────────────────┐                                 |
|   │ Word (1,2) + Char (3,5) N-Gram Feature Union (50,000 dims) │                                 |
|   └────────────────────────────┬────────────────────────────────┘                                 |
|                                │                                                                  |
|                                ▼                                                                  |
|   ┌─────────────────────────────────────────────────────────────┐                                 |
|   │ Logistic Sigmoid Inference & Probability Calculation        │                                 |
|   │ P(Positive) = sigma(z) = 1 / (1 + exp(-(beta_0 + sum X*b))) │                                 |
|   └────────────────────────────┬────────────────────────────────┘                                 |
|                                │                                                                  |
|         ┌──────────────────────┼──────────────────────┐                                           |
|         ▼                      ▼                      ▼                                           |
|   P(Pos) > 0.60         0.40 <= P <= 0.60       P(Pos) < 0.40                                     |
|   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐                                   |
|   │ Auto-Approved │     │   Ambiguity   │     │ High-Priority │                                   |
|   │ Low-Priority  │     │ Corridor Triage│     │ Defect Triage │                                   |
|   │ Queue (<2 min)│     │ Queue (Inbox) │     │ Alert (<15 min)│                                  |
|   └───────────────┘     └───────────────┘     └───────────────┘                                   |
+---------------------------------------------------------------------------------------------------+
```

### Key Engineering Features

- **Domain-Adapted NLP Architecture:** Trained and evaluated on Yelp business reviews rather than movie datasets, yielding a **+10.52 percentage point increase in negative review recall** (from 83.14% to 93.66%) while maintaining 92.44% overall accuracy.
- **Sub-10ms Serverless Inference:** Lean Python serverless execution on Vercel without heavy PyTorch/TensorFlow containers, executing inference in 5.8ms to 9.5ms with cold starts under 850ms.
- **Ambiguity Corridor Triage:** Reviews with probabilities between 0.40 and 0.60 are assigned `Mixed` sentiment and automatically flagged for human supervisor review.
- **Exact Linear Attribution:** Direct calculation of $X_j \cdot \beta_j$ provides instantaneous token-level explainability chips without sampling overhead.
- **Topic-Aware Operational Categorization:** Contextual regex mapping assigns constructive topics (*Rooms & Amenities*, *Food & Dining*, *Staff & Hospitality*, *Value & Pricing*) to positive feedback and defect categories (*Maintenance & Repairs*, *Slow Service*, *Hygiene*) to negative feedback.
- **RFC-4180 CSV Ingestion & Pre-Validation Gate:** Handles comma/semicolon/tab delimited files, auto-detects review text and metadata columns, and silently filters noise rows (empty strings, whitespace, or tokens $\le 3$ characters).

---

## 8-Screen SaaS User Experience Walkthrough

Revio features a comprehensive web interface designed for operational teams and property managers:

1. **Screen 01 — Live Inference Playground (`/#playground`):** Test individual reviews with real-time probability gauge, triage decision pill, explainability chips, and latency counter.
2. **Screen 02 — Multi-Modal Ingestion Hub (`/#import`):** Supports drag-and-drop CSV uploads (up to 2,500 reviews), direct text paste, or one-click sample batch loading.
3. **Screen 03 — CSV Preview & Noise Gate (`/#csv-preview`):** Schema auto-detection with visual noise pre-validation filtering.
4. **Screen 04 — Dynamic Progress Stepper (`/#processing`):** Multi-stage animated processing card showing live batch streaming milestones.
5. **Screen 05 — Results Overview Dashboard (`/#results`):** Executive KPI cards, animated SVG sentiment donut chart, and automated thematic category distribution bars.
6. **Screen 06 — Review Inbox & Triage Data Grid (`/#inbox`):** 8-column responsive operational table with interactive tabs (`All`, `Negative`, `Mixed`, `Positive`, `Needs review`), topic sub-labels, and batch actions.
7. **Screen 07 — Review Detail Slide-Out Drawer (`/#detail`):** Deep probability breakdown, ambiguity alerts, business risk analysis, top 8 feature attribution chips, and one-click status resolution.
8. **Screen 08 — Model Lab & Governance Dashboard (`/#models`):** Inspect active model candidate vs champion parameters, training lineage, and inference telemetry.

---

## Machine Learning Architecture & Methodology

### 1. Empirical Model Comparison

| Model & Training Corpus | Evaluation Split | Negative Recall | Accuracy | Macro F1 | Serverless Footprint | Warm Latency |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **IMDb Baseline LR** | IMDb Held-Out Test (25k) | 90.20% | 90.15% | 90.10% | 12.37 MB | ~2.0 ms |
| **IMDb Baseline LR (Zero-Shot)** | Yelp Business Corpus (3k) | 83.14% | 85.84% | 85.40% | 12.37 MB | ~2.0 ms |
| **IMDb Bi-LSTM** | IMDb Held-Out Test (25k) | 84.50% | 84.67% | 84.70% | 78.0 MB | ~22.0 ms |
| **IMDb Fine-Tuned BERT** | IMDb Held-Out Test (25k) | 89.79% | 91.68% | 91.52% | 438.0 MB | ~72.0 ms |
| **Revio Champion LR (`yelp_word_char_lr`)** | Yelp In-Domain Test (2.5k) | 91.42% | 90.88% | 90.80% | 1.11 MB | ~8.5 ms |
| **Revio Candidate LR (`yelp_word_char_lr_candidate`)** | Yelp In-Domain Test (2.5k) | **93.66% (+10.52%)** | **92.44% (+6.60%)** | **92.40%** | **1.16 MB** | **~6.2 ms** |

### 2. Mathematical Formulation

The production candidate evaluates normalized TF-IDF feature vector $X \in \mathbb{R}^{50,000}$ via the logistic sigmoid link:

$$P(\text{Positive} \mid X) = \sigma(z) = \frac{1}{1 + e^{-z}} = \frac{1}{1 + \exp\left(-\left(\beta_0 + \sum_{j=1}^{50,000} X_j \cdot \beta_j\right)\right)}$$

- **Calibrated Decision Boundary:** Operating threshold set to **$T = 0.55$** (requiring stronger evidence for positive classification and boosting critical negative recall).
- **Linear Feature Attribution:** Exact token contribution computed instantaneously as:

$$\text{Contribution}_j = X_j \cdot \beta_j$$

---

## Repository Structure

```
Revio/
├── api/                                # Consolidated Vercel Serverless Backend
│   ├── artifacts/                      # Production Model Artifacts
│   │   ├── yelp_word_char_lr_candidate.joblib      (1.16 MB - Active Candidate)
│   │   ├── yelp_word_char_lr_candidate.meta.json   (Threshold T=0.55, Metrics)
│   │   ├── yelp_word_char_lr.joblib                (1.11 MB - Champion Fallback)
│   │   └── yelp_word_char_lr.meta.json             (Threshold T=0.48)
│   ├── index.py                        # FastAPI Application & Serverless Handlers
│   └── requirements.txt                # Lean dependencies (scikit-learn, fastapi, joblib)
├── frontend/                           # Static Web Application (Vercel Edge Network)
│   ├── css/
│   │   └── revio-app.css               # Complete Revio SaaS Design System (3,400+ lines)
│   ├── js/
│   │   └── revio-app.js                # State Management, RFC Parser, Triage Logic
│   ├── index.html                      # Production Entry Point
│   └── revio.html                      # Mirror entry point with binary parity
├── docs/                               # Formal Assessment Reports & Verification
│   ├── AI_OPPORTUNITY_REPORT.pdf       # Deliverable 1 (Executive PDF)
│   ├── AI_OPPORTUNITY_REPORT.md        # Deliverable 1 (Markdown Source)
│   ├── PROOF_OF_CONCEPT_POC_REPORT.pdf # Deliverable 2 (Executive PDF)
│   ├── PROOF_OF_CONCEPT_POC_REPORT.md  # Deliverable 2 (Markdown Source)
│   ├── TECHNICAL_APPROACH_REPORT.pdf   # Deliverable 3 (Executive PDF)
│   ├── TECHNICAL_APPROACH_REPORT.md    # Deliverable 3 (Markdown Source)
│   ├── PROJECT_CHRONICLE.md            # Authoritative Development Historical Record
│   └── screenshots/                    # Real Chromium Browser Test Screenshots
├── tests/                              # Automated Pytest Regression Suites (47 tests)
│   ├── test_revio_vercel_architecture.py
│   ├── test_revio_phase2a_gate.py
│   ├── test_revio_api.py
│   ├── test_revio_candidate_audit.py
│   ├── test_revio_activation_workflow.py
│   └── test_revio_production_readiness.py
├── scripts/                            # Operational Automation & Verification Scripts
│   ├── convert_reports_to_pdf.py       # Playwright PDF Publication Generator
│   ├── verify_user_journey_playwright.py # End-to-End Chromium Verification
│   └── evaluate_100_reviews.py         # 100-Review Batch Benchmark Script
├── revio_100_reviews_comprehensive_test.csv # Benchmark Evaluation Dataset (100 Rows)
├── vercel.json                         # Vercel Deployment Specification & Routing
└── pyproject.toml                      # Pytest & Environment Configuration
```

---

## Local Setup & Quickstart Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.12 and 3.13)
- Node.js 18+ (optional, for static serving)
- Git

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/gautamhardik/Revio.git
cd Revio

# Install serverless backend dependencies & test runners
pip install -r api/requirements.txt pytest httpx playwright
```

### 2. Run the Local Backend

```bash
cd api
python -m uvicorn index:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI documentation will be accessible at `http://127.0.0.1:8000/docs`.

### 3. Run the Local Frontend

In a separate terminal window:
```bash
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser. The interface will automatically route inference requests to the local backend.

### 4. Run the Automated Test Suite

```bash
# Execute all 47 unit, API, candidate gate, and architecture tests
pytest
```
*Expected result:* `47 passed in ~8-15s`.

### 5. Run Live Browser Journey Automation

```bash
# Install Playwright browser binaries
playwright install chromium

# Run end-to-end user journey tests against the production Vercel deployment
python scripts/verify_user_journey_playwright.py
```

---

## Quantitative Business Impact (Cynbit Portfolio ROI)

Based on empirical workload modeling for a mid-market hospitality brand (50 locations) or residential property manager (5,000 units) processing **4,000 feedback tickets per month**:

| Performance Dimension | Traditional Human Triage | Revio Risk-Gated Engine | Operational Improvement |
|---|---|---|:---:|
| **Direct Monthly Triage Labor Cost** | $18,000 ($4.50 / ticket) | $4,400 ($1.10 blended) | **-75.5% ($13,600/mo net savings)** |
| **Response Turnaround Time (Praise)** | 18 hours | < 2 minutes (automated) | **-99.8% turnaround reduction** |
| **Response Turnaround Time (Defects)** | 24 hours | < 30 minutes (escalated) | **-97.9% turnaround reduction** |
| **Automated PR Misclassifications** | 24 incidents / month | < 2 incidents / month | **-91.7% brand risk reduction** |
| **Tenant Churn from Unresolved Issues** | Baseline rate (100%) | 18% churn reduction | **High-retention operational impact** |

---

## License

This project is licensed under the [MIT License](LICENSE).
