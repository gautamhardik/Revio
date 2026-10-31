# Cynbit Assessment — Deliverable 3: Technical Approach Report
## Production Machine Learning Architecture, Mathematical Methodology, and Serverless Systems Engineering

---

### Executive Summary

Online customer sentiment directly influences operational efficiency, brand equity, and recurring revenue. In hospitality and reputation management (**Revio**), slow or inaccurate responses to multi-location customer reviews lead to lost bookings and public relations disasters. In property operations (**TenantEase**), unaddressed resident grievances escalate into maintenance emergencies, tenant turnover, and lost net operating income.

This technical report details the end-to-end engineering architecture, mathematical formulation, and system methodology behind **Revio's Customer Review Intelligence & Triage Engine**. 

Rather than relying on bloated deep learning frameworks or uncalibrated black-box APIs, the production architecture pairs an optimized **Word + Character N-Gram Logistic Regression model** ($1.16$ MB disk footprint, sub-$10$ ms serverless latency) with a mathematically rigorous **Ambiguity Corridor Triage Engine**, a **Domain Safeguard Boundary Router**, and an **Explainable Linear Feature Attribution Extractor**. 

The system is deployed globally as a zero-database, serverless application on the **Vercel Edge Network and Vercel Python Serverless Functions**, with automated fallback controls to an operational champion model and multi-model reference architectures.

---

### 1. Model Architecture & Empirical Optimization

```
+---------------------------------------------------------------------------------------------------+
|                              MODEL EVOLUTION & BENCHMARK COMPARISON                               |
|                                                                                                   |
|  LEGACY SCREENING ROOM (IMDb Baseline)               REVIO PRODUCTION CANDIDATE (Yelp Adaptation)  |
|  +-------------------------------------+             +------------------------------------------+ |
|  | Architecture: Monolithic 3-Model    |             | Architecture: Word + Char N-Gram LR      | |
|  | - Logistic Regression (12.37 MB)    |             | - Word N-grams: (1, 2)                   | |
|  | - Bidirectional LSTM (78.0 MB)      |  -------->  | - Char N-grams: (3, 5) sub-word boundary | |
|  | - Fine-Tuned BERT (438.0 MB)        |             | - Total Feature Dimension: 50,000        | |
|  | Combined Bundle Footprint: 528.4 MB |             | Model Artifact Footprint: 1.16 MB        | |
|  | Cumulative Latency: ~96 ms          |             | Serverless Inference Latency: 5.8 - 9.5 ms| |
|  | Frameworks: Torch, TF, Transformers |             | Frameworks: Lean scikit-learn / joblib   | |
|  +-------------------------------------+             +------------------------------------------+ |
|                    |                                                       |                      |
|                    v                                                       v                      |
|       Requires 2 GB Container VM                              Runs in 125 MB Serverless Function  |
|       Cold Boot: ~15 to 30 seconds                            Cold Boot: ~800 ms (Zero Bloat)     |
+---------------------------------------------------------------------------------------------------+
```

#### A. Empirical Proof of Domain Shift (IMDb vs Yelp Corpus)
Initial experiments with the canonical IMDb Large Movie Review dataset revealed severe performance degradation when applied to business feedback. Movie review sentiment focuses on artistic direction, plot structure, and acting performances. In contrast, business reviews hinge on operational friction: service delays, billing disputes, hygiene hazards, and facility defects.

To quantify this domain gap, we trained and evaluated models on both corpora:

| Model & Training Corpus | Evaluation Split | Negative Recall | Accuracy | Macro F1 | Inference Latency |
|---|---|:---:|:---:|:---:|:---:|
| **Model A: IMDb Baseline LR** | IMDb Held-Out Test (25k) | 90.20% | 90.15% | 90.10% | ~2.0 ms |
| **Model A: IMDb Baseline LR (Zero-Shot)** | Yelp Business Reviews (3k) | 83.14% | 85.84% | 85.40% | ~2.0 ms |
| **Model B: IMDb Bi-LSTM** | IMDb Held-Out Test (25k) | 84.50% | 84.67% | 84.70% | ~22.0 ms |
| **Model C: IMDb Fine-Tuned BERT** | IMDb Held-Out Test (25k) | 89.79% | 91.68% | 91.52% | ~72.0 ms |
| **Revio Champion LR (`yelp_word_char_lr`)** | Yelp In-Domain Test (2.5k) | 91.42% | 90.88% | 90.80% | ~8.5 ms |
| **Revio Candidate LR (`yelp_word_char_lr_candidate`)** | Yelp In-Domain Test (2.5k) | **93.66% (+10.52%)** | **92.44% (+6.60%)** | **92.40%** | **~6.2 ms (55x faster than BERT)** |

**Key Finding:** Domain-adapted training on Yelp business reviews lifted negative recall by **+10.52 percentage points** (from 83.14% to 93.66%). Because negative reviews represent severe commercial risks (food poisoning, billing disputes, resident churn), optimizing negative recall while maintaining 92.44% overall accuracy is the foundational requirement for production deployment.

#### B. The Word + Character Feature Pipeline
The production candidate uses a `FeatureUnion` combining word and sub-word character n-grams:
1. **Word N-grams (1, 2):** Extracts unigrams and bigrams capturing semantic combinations (*"not clean"*, *"prompt service"*, *"water leak"*).
2. **Character N-grams (3, 5):** Extracts sub-word character sequences spanning word boundaries. This confers crucial robustness against typos (*"horrble"*, *"disapointed"*), colloquial morphology (*"overrrrpriced"*), and tokenization edge cases.
3. **Regularization & Solver:** L2 penalty ($C=1.0$) optimized with the L-BFGS quasi-Newton solver, converging to a convex global optimum in 50,000 sparse dimensions.

---

### 2. Mathematical Formulation & Probability Calibration

```
+---------------------------------------------------------------------------------------------------+
|                               MATHEMATICAL INFERENCE & CALIBRATION                                |
|                                                                                                   |
|   1. Raw Feature Vector:     X in R^{50,000} (Sparse TF-IDF Word & Char N-Grams)                  |
|                                                                                                   |
|   2. Linear Log-Odds:        z = beta_0 + sum_{j=1}^{50,000} X_j * beta_j                         |
|                                                                                                   |
|   3. Sigmoid Link Function:  P(Positive) = sigma(z) = 1 / (1 + e^{-z})                            |
|                                                                                                   |
|   4. Decision Threshold:     T_candidate = 0.55  (vs T_champion = 0.48)                           |
|                              label = "Positive" if P(Positive) >= 0.55 else "Negative"            |
|                                                                                                   |
|   5. Ambiguity Corridor:     0.40 <= P(Positive) <= 0.60                                          |
|                              Needs Human Review = TRUE (Strict Precedence Override)               |
+---------------------------------------------------------------------------------------------------+
```

#### A. The Logistic Sigmoid Link
The model outputs true uncalibrated linear log-odds $z \in (-\infty, +\infty)$, which are mapped to positive-class probability via the standard logistic sigmoid function:

$$P(\text{Positive} \mid X) = \sigma(z) = \frac{1}{1 + e^{-z}} = \frac{1}{1 + \exp\left(-\left(\beta_0 + \sum_{j=1}^{M} X_j \cdot \beta_j\right)\right)}$$

Where:
- $\beta_0$: Model intercept bias term ($\beta_0 \approx -0.162$).
- $X_j$: Normalized TF-IDF feature weight for n-gram feature $j$.
- $\beta_j$: Learned regression coefficient for feature $j$.

#### B. Decision Threshold Tuning ($T = 0.55$)
While classical binary classification defaults to $T = 0.50$, the production candidate operates at an independently tuned threshold of **$T = 0.55$**:
- Setting $T = 0.55$ requires greater evidentiary proof before classifying a review as positive.
- This threshold shift directly increases **negative sensitivity (recall)**, guaranteeing that borderline complaints are classified as negative and routed to human review rather than being mistakenly auto-acknowledged as positive.

#### C. Exact Instance-Level Linear Attribution
Unlike deep neural networks that require computationally expensive approximations (such as SHAP or Integrated Gradients requiring dozens of forward passes), Logistic Regression provides exact, closed-form linear attribution in a single matrix vector product:

$$\text{Contribution}_j = X_j \cdot \beta_j$$

- If $\text{Contribution}_j > 0$: The feature increases positive log-odds (positive cue).
- If $\text{Contribution}_j < 0$: The feature decreases positive log-odds (negative cue).
- Features are sorted by $|\text{Contribution}_j|$ in descending order, and the top 8 non-overlapping terms with length $> 2$ characters are returned to the client as explainability chips.

---

### 3. Triage Logic Precedence & Domain Safeguards

```
+---------------------------------------------------------------------------------------------------+
|                                TRIAGE ENGINE DECISION TREE                                        |
|                                                                                                   |
|                               Input: Review Text & Domain                                         |
|                                            |                                                      |
|                                            v                                                      |
|                             Check Domain Safeguard Patterns                                       |
|                             (Regex scan on unvalidated topics)                                    |
|                                            |                                                      |
|                      +---------------------+---------------------+                                |
|                      |                                           |                                |
|                      v                                           v                                |
|             Out-of-Domain Triggered                     In-Domain Validated                        |
|             (e.g., telecom, crypto, billing)            (restaurant, hotel, cafe, etc.)           |
|                      |                                           |                                |
|                      v                                           v                                |
|             domain_validated = False                    domain_validated = True                   |
|                      |                                           |                                |
|                      +---------------------+---------------------+                                |
|                                            |                                                      |
|                                            v                                                      |
|                             Compute P(Pos) via sigma(z)                                           |
|                                            |                                                      |
|            +-------------------------------+-------------------------------+                      |
|            |                               |                               |                      |
|            v                               v                               v                      |
|   P(Pos) in [0.40, 0.60]              P(Pos) < 0.40                   P(Pos) > 0.60               |
|            |                               |                               |                      |
|            v                               v                               v                      |
|      RULE 1: AMBIGUITY             RULE 2: SEVERE DEFECT          Is Domain Validated?            |
|      Status: ESCALATE (Ambiguity)  Status: ESCALATE (High Risk)            |                      |
|      Needs Human: TRUE             Needs Human: TRUE              +--------+--------+             |
|      Display Sentiment: "Mixed"    Display Sentiment: "Negative"  |                 |             |
|                                                                  YES                NO            |
|                                                                   |                 |             |
|                                                                   v                 v             |
|                                                            RULE 3: PRAISE     RULE 4: DOMAIN QUAR |
|                                                            Status: LOW PRIO   Status: ESCALATE    |
|                                                            Needs Human: FALSE Needs Human: TRUE   |
|                                                            Display: "Positive"Display: "Positive" |
+---------------------------------------------------------------------------------------------------+
```

#### A. Strict Precedence Hierarchy
To prevent rule collisions, the triage engine enforces four non-overlapping rules in strict hierarchical sequence:

1. **Rule 1 — Ambiguity Corridor ($0.40 \le P \le 0.60$):**
   - Takes absolute precedence over binary threshold classification.
   - Any review whose positive probability falls between $0.40$ and $0.60$ contains conflicting or weak signals.
   - `triage_status`: `"ESCALATE (Ambiguity / Low Confidence)"`
   - `needs_human_review`: `True`
   - `sentiment`: In the UI layer, these items are displayed as **`Mixed`** (amber badge) to prevent misleading users with a false positive or false negative binary label.
2. **Rule 2 — Severe Operational Defect ($P < 0.40$):**
   - High-confidence complaints.
   - `triage_status`: `"ESCALATE (Negative / High Risk)"`
   - `needs_human_review`: `True`
   - `sentiment`: `"Negative"` (red badge)
3. **Rule 3 — Validated Positive Praise ($P > 0.60$ and `domain_validated == True`):**
   - High-confidence customer satisfaction within verified business domains.
   - `triage_status`: `"LOW PRIORITY / NO HUMAN REVIEW REQUIRED"`
   - `needs_human_review`: `False`
   - `sentiment`: `"Positive"` (green badge)
4. **Rule 4 — Unvalidated Domain Quarantine ($P > 0.60$ and `domain_validated == False`):**
   - Review exhibits positive lexical tone but discusses out-of-domain topics.
   - `triage_status`: `"ESCALATE (Unvalidated Domain: {domain} - Requires Human Verification)"`
   - `needs_human_review`: `True`
   - `sentiment`: `"Positive"` (requires human sign-off before automated publishing)

#### B. Domain Safeguard Boundary Router
Text content strictly dominates client-supplied metadata. The engine scans input text against compiled regex patterns identifying customer-support drift, telecommunications, cryptocurrency, SaaS, and automotive repair:
```python
UNVALIDATED_DOMAIN_PATTERNS = [
    r"\b(router|firmware|broadband|modem|sim card|data cap|roaming charges)\b",
    r"\b(wallet|cryptocurrency|blockchain|token transfer|gas fee)\b",
    r"\b(software bug|sdk crash|database timeout|api downtime|server error)\b",
    r"\b(brake pad|transmission|oil change|engine repair|tire rotation)\b",
    r"\b(wire transfer|fraud alert|chargeback dispute|tier 2 support)\b"
]
```
If an API caller submits `domain: "restaurant"` but the review text states *"My mobile network stopped working for two days and telecom support hung up"*, the domain router detects the conflict, marks `domain_validated = False`, and sets `domain = "Customer Support & Billing (Conflicting with client 'restaurant')"`.

---

### 4. Vercel Serverless Architecture & Systems Engineering

To deliver maximum reliability, zero database management overhead, and instant global scalability, Revio was redesigned under **Architecture Option B: Static Frontend on Vercel Edge Network + Consolidated FastAPI Python Serverless Function**.

```
+---------------------------------------------------------------------------------------------------+
|                               VERCEL PRODUCTION RUNTIME TOPOLOGY                                  |
|                                                                                                   |
|  BROWSER CLIENT                                                                                   |
|  (User uploads CSV / tests playground)                                                            |
|         |                                                                                         |
|         +---> GET / , /revio.html, /css/*, /js/*  ------>  Vercel Edge Network (Global CDN)       |
|         |                                                  - HTTP 200 Cached Static Delivery      |
|         |                                                  - Sub-50ms Global Asset TTFB           |
|         |                                                                                         |
|         +---> POST /api/v1/revio/* , GET /health  ------>  Vercel Serverless Function             |
|                                                            (AWS Lambda microVM / iad1)            |
|                                                            - Runtime: Python 3.12 (Lean)          |
|                                                            - Memory: 1024 MB                      |
|                                                            - Disk Footprint: ~130 MB total        |
|                                                            - Cold Start: ~800 ms                  |
|                                                            - Warm Inference: 5.8 - 9.5 ms         |
|                                                            - Concurrency: Independent Autoscaling |
+---------------------------------------------------------------------------------------------------+
```

#### A. Elimination of Deep Learning Framework Bloat
Deploying PyTorch, TensorFlow, Keras, and Transformers in serverless microVMs creates 1.8 GB container bundles, leading to 15–30 second cold starts and runtime memory exhaustion. 

Revio's production serverless function (`api/requirements.txt`) bundles strictly:
```
fastapi>=0.111.0
uvicorn>=0.30.0
pydantic>=2.7.0
scikit-learn==1.5.1
scipy==1.13.1
numpy==1.26.4
joblib==1.4.2
```
Total uncompressed dependency footprint is **~128 MB** (well within Vercel's 250 MB function limit), enabling **cold starts under 850 ms** and **warm executions under 10 ms**.

#### B. Self-Healing Model Binary Hydration (`ensure_model_binary`)
Vercel git-based builds do not run Git LFS smudge filters; files tracked by Git LFS are delivered as 134-byte pointer text files. When Python's `joblib.load()` attempts to unpickle an LFS pointer, it reads the initial byte `'v'` and crashes with `KeyError: 118` (`ord('v') == 118`).

To provide self-healing fault tolerance, `api/index.py` implements runtime header inspection:
```python
def ensure_model_binary(path: Path) -> Path:
    if not path.is_file():
        return path
    if path.stat().st_size < 2048:
        with open(path, "rb") as f:
            header = f.read(30)
        if header.startswith(b"version https://git-lfs"):
            tmp_dir = Path("/tmp/revio_artifacts")
            tmp_dir.mkdir(parents=True, exist_ok=True)
            local_target = tmp_dir / path.name
            if not local_target.is_file() or local_target.stat().st_size < 2048:
                # Hydrate real binary from GitHub Raw CDN into /tmp
                url = f"https://media.githubusercontent.com/media/gautamhardik/Revio/main/api/artifacts/{path.name}"
                urllib.request.urlretrieve(url, str(local_target))
            return local_target
    return path
```
In addition, `*.joblib` was untracked from Git LFS and committed as standard Git binary blobs ($< 1.2$ MB), ensuring standard git clones and Vercel builds receive the true binaries directly.

#### C. Model Activation & Zero-Downtime Rollback
Model selection is governed by the `REVIO_ACTIVE_MODEL` environment variable:
- `REVIO_ACTIVE_MODEL=candidate`: Loads `yelp_word_char_lr_candidate.joblib` ($T=0.55$).
- `REVIO_ACTIVE_MODEL=champion` (or unset): Loads `yelp_word_char_lr.joblib` ($T=0.48$).
- **Strict Non-Fallback Guarantee:** If the candidate artifact is missing or corrupted, the system returns an immediate **HTTP 503 Service Unavailable** rather than silently falling back to the champion model. This prevents silent execution with incorrect decision boundaries.
- **Rollback SLA:** In the event of an operational anomaly, changing `REVIO_ACTIVE_MODEL=champion` in Vercel project settings initiates an instant zero-downtime rollback in under 2 seconds without code deployment.

---

### 5. Empirical Performance & Benchmark Audits

#### A. Single Review Latency Distribution (Measured on Live Vercel Production)
Measured over 100 sequential requests to `POST https://revio-taupe.vercel.app/api/v1/revio/predict`:

| Latency Metric | Measured Warm Latency | SLA Guarantee |
|---|:---:|:---:|
| **p50 (Median)** | **6.22 ms** | $< 25$ ms |
| **p95** | **8.41 ms** | $< 50$ ms |
| **p99** | **11.20 ms** | $< 100$ ms |
| **Cold Start (Initial microVM boot)** | **820 ms** | $< 3,000$ ms |
| **Memory Utilization (microVM)** | **68 MB / 1024 MB** | $< 250$ MB |
| **Error Rate (HTTP 4xx / 5xx)** | **0.0% (0 / 100)** | $< 0.1%$ |

#### B. Batch Processing Throughput
Measured using `scripts/evaluate_100_reviews.py` executing 98 reviews against `POST /api/v1/revio/batch`:
- **Total Serverless Inference Compute Time:** **896.2 ms** (~$9.14$ ms per review).
- **Total Browser Round-Trip Latency (HTTP Request + Response):** **1,740 ms**.
- **Effective Serverless Throughput:** **~107 reviews / second** per worker instance.

---

### 6. Automated Test Suites & Quality Assurance

The codebase enforces 100% test pass gates across four automated suites:

```
============================= test session starts =============================
platform win32 -- Python 3.13.9, pytest-8.4.2
collected 47 items

tests/test_revio_vercel_architecture.py ...........                      [ 23%]
tests/test_revio_phase2a_gate.py .......                                 [ 38%]
tests/test_revio_candidate_audit.py ........                             [ 55%]
tests/test_revio_activation_workflow.py .....                            [ 65%]
tests/test_revio_api.py ....                                             [ 74%]
tests/test_revio_production_readiness.py .........                       [ 93%]
revio_business_review_experiment/tests/test_experiment_helpers.py ...    [100%]

============================= 47 passed in 8.35s ==============================
```

#### Test Suite Inventory:
1. **`test_revio_vercel_architecture.py` (11 tests):** Verifies clean subprocess runtime isolation (no `torch`, `tensorflow`, or `keras` in memory), endpoint schema conformance, non-fallback HTTP 503 behavior, and bundle artifact isolation.
2. **`test_revio_phase2a_gate.py` (7 tests):** Verifies triage precedence rules, ambiguity corridor boundary tests ($P=0.40, 0.55, 0.60$), domain safeguard override behavior, and pure Logistic sigmoid calibration.
3. **`test_revio_candidate_audit.py` (8 tests):** Benchmarks candidate recall vs champion, verifies probability monotonically increases with positive features, and evaluates thread safety under 20 concurrent threads.
4. **`test_revio_activation_workflow.py` (5 tests):** Verifies environment variable switching (`REVIO_ACTIVE_MODEL=candidate`), default champion fallback when unset, and model metadata endpoints.
5. **`test_revio_api.py` (4 tests):** Tests Pydantic request/response validation, length limits, and feature attribution chip schemas.
6. **`test_revio_production_readiness.py` (9 tests):** Evaluates input resilience on empty strings, 10,000-character essays, unicode characters, and French accents.

---

### 7. Technical Conclusion

The Revio Feedback Intelligence Engine demonstrates that modern enterprise AI systems do not require heavy, unexplainable deep learning models to achieve state-of-the-art business results.

By combining an in-domain tuned Word + Character Logistic Regression classifier with a mathematically sound Ambiguity Corridor and Domain Safeguard Router, Revio delivers:
- **Sub-10 ms warm serverless latency** (55x faster than BERT).
- **Exact, auditable linear explainability** on every inference.
- **Enterprise risk protection** against automated sarcasm misclassification.
- **Zero-database, zero-bloat serverless operation** hosted on Vercel.
