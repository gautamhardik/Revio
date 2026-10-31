# Revio — Page-by-page product and interaction specification

The image references establish visual direction. This document defines what each screen must contain and what each control must do. Sample copy and sample figures below are for design/demo purposes only unless identified as a measured benchmark.

## Shared application shell

Every authenticated page uses the same shell:

- **Left sidebar:** Revio mark; Analyse; Review Inbox; Insights; Model Lab (role-gated if internal); Settings; workspace selector at bottom if supported.
- **Topbar:** breadcrumb/page context; global search if functional; help/notification controls only if implemented; avatar and workspace menu.
- **Workspace:** warm ivory canvas, charcoal sidebar, consistent content width and page padding, pale cards with fine borders.
- **Persistent behavior:** sidebar active state reflects current route; page title/breadcrumb updates; global search and avatar menu must work or be omitted.

## 01 — Public landing page

**Reference:** `page_references/01_landing_page.png`  
**Purpose:** Explain Revio and motivate a first analysis.

### Layout

- Graphite/near-black full-page background.
- Header with Revio wordmark left; Product, Solutions, Pricing, Resources in the center; Sign in and Get started on the right.
- Hero split: left editorial copy; right large sculptural translucent glass/stone object on a restrained mineral landscape.
- Floating review snippets may show brief sample reviews with Positive, Mixed and Negative labels, clearly marked as examples.
- Lower proof/value strip: use real customer proof only if authorised. Otherwise show product capabilities or industries without fabricated customer logos.

### Copy direction

Eyebrow: `AI REVIEW INTELLIGENCE`  
Headline: `Every review has a signal.`  
Body: `Turn customer feedback into clearer decisions. Understand sentiment, find recurring problems, and focus on what truly matters.`

### Controls

- `Product`, `Solutions`, `Pricing`, `Resources`: navigate to real sections/routes.
- `Sign in`: open actual authentication flow.
- `Get started`: start onboarding.
- `Analyse reviews`: primary CTA; start onboarding/import.
- `Watch demo`: open a real demo/video or an in-page interactive sample. Do not leave a dead button.

### Behavior

- 3D object responds subtly to pointer and scroll, with low movement amplitude.
- Floating review snippets move slowly and remain readable.
- Main CTA is usable immediately; animation must not delay click.
- Mobile: stacked hero; 3D object below or beside headline; navigation collapses into an accessible menu.

### Data/claims rules

Do not display `2.5K reviews`, `92.4% accuracy`, `3× faster`, customer logos or ROI claims as product facts unless the exact claim has a verified source and appropriate context. Prefer a benefits strip over unverified metrics.

## 02 — Onboarding / import choice

**Reference:** `page_references/02_onboarding_import.png`  
**Purpose:** Let users choose how to provide reviews.

### Layout

- Shared app shell; Analyse selected in sidebar.
- Page heading: `Let's analyse your reviews`.
- Three equal import choice cards: Upload CSV, Paste text, Try a sample.
- Selected choice uses a soft violet border/fill; unselected choices remain neutral.
- CSV choice reveals a large dropzone; Paste text reveals a multiline field; Try a sample loads explicitly labelled demo data.
- Compact helper panel explains the required `review_text` column and any real supported optional metadata columns.

### Buttons and controls

- `Upload CSV`: opens file picker; also supports drag and drop.
- `Paste text`: switches to text-input mode.
- `Try a sample`: loads clearly labelled sample reviews (never silently mixes demo data with real data).
- `Choose file` / dropzone: validate extension, MIME type and configured size limit.
- `Remove file`: clears selected file and resets validation state.
- `Continue`: disabled until there is valid input; proceeds to CSV preview or directly to text confirmation as appropriate.

### Validation

Read file limits from configuration; do not invent a 10 MB limit. Required field: review text (`review_text` or a user-mapped equivalent). Optional columns should be limited to what the data model actually stores, such as rating, date, source/platform and external review ID.

## 03 — CSV preview and validation

**Reference:** `page_references/03_csv_preview_validation.png`  
**Purpose:** Prevent silent data loss and let the user confirm the data mapping before analysis.

### Layout

- File summary strip: filename, file size, detected row count, Change file.
- Two-column body: column mapping on the left; preview of the first five rows on the right (responsive stack on smaller screens).
- Validation summary below: valid rows, rejected rows and missing required values.
- Table preview with truncated review text and available optional fields.

### Controls

- Column mapping select for required review text.
- Optional mapping selects for rating, date, source/platform and external ID only if supported.
- `Change file`: reopen file chooser.
- `Back`: return to import choice.
- `Start analysis`: submit only valid rows, with the exact valid count displayed.
- `Download error report`: available only when rejected rows exist; exports row number and reason, not private stack traces.

### States

- Loading file, parsing, valid, partially valid, invalid, too large, wrong format, missing review-text column, zero valid rows.
- Explain each error and how to fix it.
- Never display `Ready` unless parsing and validation actually completed.

## 04 — Analysis processing

**Reference:** `page_references/04_analysis_processing.png`  
**Purpose:** Provide calm feedback while actual inference is running.

### Layout

- Shared app shell.
- Left: `Analysing your reviews`, short explanation and a vertically ordered stage list.
- Right: restrained sculptural glass object, larger than a normal icon but smaller than the landing hero.
- Optional count: `Processed X of Y` only if the service provides reliable per-row progress.

### Suggested stages

1. Upload received.
2. Validating rows.
3. Running sentiment inference.
4. Saving results.

Theme extraction or insight generation should appear only if that capability exists and is part of the actual run.

### Controls

- `Cancel`: shown only if request/job cancellation is implemented. Otherwise omit it.
- `Back to results` or `Return to inbox`: shown only when navigation is safe and will not discard data.

### Critical truthfulness rule

Do not invent percentage progress. For a synchronous request with no progress events, use an indeterminate loader and honest stage text. Do not promise that the user can leave the page unless the job continues server-side and can be resumed.

## 05 — Results overview

**Reference:** `page_references/05_results_overview.png`  
**Purpose:** Summarise the completed analysis and direct the user to useful work.

### Layout

- Heading: `Analysis complete` plus batch name/date and run context.
- Top stat row: total processed, positive, negative, mixed/no-consensus or needs-review count—only categories the backend actually returns.
- Main content: sentiment distribution chart on the left; recurring themes/top patterns on the right only if implemented.
- Lower section: recent review samples or a short “Needs attention” list.

### Buttons

- `Download report`: exports this run's actual results.
- `New analysis`: starts a fresh import.
- `Open review inbox`: routes to the filtered inbox for this batch.
- `View all`: opens the full theme/review list only when available.

### Data rules

Calculate counts/percentages from this analysis run. Use an explicit `Demo data` badge when using sample records. If a theme engine is not implemented, replace the theme card with a truthful empty state or omit it.

## 06 — Review inbox

**Reference:** `page_references/06_review_inbox.png`  
**Purpose:** Make reviews searchable, comparable and actionable.

### Layout

- Page heading and Import reviews action.
- Filter tabs/chips: All, Positive, Negative, Mixed/No consensus, Needs review (only valid status categories).
- Search input and filter row.
- Table/list with columns: selection, sentiment, review excerpt, confidence (if present), source (if present), date (if present), workflow status.
- Each row is clickable and opens Review detail.
- Pagination at the bottom; page size selector if supported.

### Controls

- `Import reviews`: opens import flow.
- Search: searches review text and supported metadata; debounced; clear action visible.
- `Filters`: opens source/date/status filters based on available data.
- Sort: newest/oldest or confidence only if values and dates exist.
- Row checkbox: supports selection.
- Row menu: actions actually supported by backend, such as Mark reviewed or Assign.
- Pagination: Previous/Next and page numbers; preserves current filters.
- `Clear filters`: resets all filters and search.

### UX details

- Use a readable table for scanning/comparison; do not turn every row into a giant card.
- Keep selected row visually distinct.
- Provide loading, no results, no data and API error states.
- Do not show source/date columns when values are absent for most rows; avoid fabricated metadata.

## 07 — Review detail

**Reference:** `page_references/07_review_detail.png`  
**Purpose:** Explain one review's model output and let a person decide what happens next.

### Layout

- Breadcrumb: Review Inbox → Review detail.
- Main column: original review text, source/date/ID metadata, sentiment prediction and model confidence if supplied.
- Explanation section: only genuine model explanations or traceable evidence. If no supported explainability exists, show the raw review, model output and metadata without inventing highlighted phrases.
- Side panel: review workflow status and next available actions.
- Optional model details disclosure: model name/version, timestamp and score.

### Buttons

- `Back to inbox`.
- Previous/Next review navigation when opened from a list.
- `Add to review queue`: only when queue persistence exists and item is not already there.
- `Mark as reviewed`: only when status persistence exists.
- `Assign`: only when assignees/users exist.
- `View full explanation`: only if a real explanation payload exists.
- `Copy review text`: copies the original review.

### Human-review logic

Prefer the backend `needs_human_review` flag. If a threshold-based rule is used, it must be documented and calibrated on held-out validation data. Do not invent a confidence cutoff in the frontend. Mixed/no-consensus handling follows the actual API output.

### Evidence design

Positive and negative evidence boxes may be shown only when evidence spans or a tested explanation module exists. Otherwise label the section `Review context` and present the original text without pretending the model extracted causal reasoning.

## 08 — Insights

**Reference:** `page_references/08_insights.png`  
**Purpose:** Turn a collection of reviews into useful, traceable patterns.

### Layout

- Heading: `Insights` with date range and selected batch/workspace context.
- Tabs: Overview, Topics, Trends, Customer feedback; hide tabs whose data is not available.
- Overview: positive/negative/mixed distribution and a small number of meaningful observations.
- Topics: complaint topics and positive themes with review count/share and links to supporting reviews.
- Customer feedback: representative review excerpts for each selected topic.

### Controls

- Date range selector only if dates are present.
- Tab navigation.
- Topic item opens a filtered inbox view.
- `View supporting reviews` opens the exact contributing reviews.

### Data rules

Do not create topic percentages from hard-coded examples. Theme extraction must be an implemented, tested pipeline. If the app only supports sentiment today, show an honest `Insights are not available for this run yet` state rather than a fake insight card.

## 09 — Model Lab

**Reference:** `page_references/09_model_lab.png`  
**Purpose:** Present technical model evaluation transparently. This page may be internal/advanced and does not need to be visible to every business user.

### Layout

- Page heading: `Model Lab`.
- Benchmark selector: Yelp business-review benchmark / IMDb movie-review benchmark; never combine them into one comparison.
- Tabs: Performance, Confusion matrix, Dataset, Model details.
- Model comparison cards/table with metrics on the same dataset/test split.
- Short note about benchmark limitations and that public-dataset results do not guarantee performance on a customer's reviews.

### User-reported benchmark values — verify local result files before display

**Yelp Polarity held-out test set (2,500 reviews):**

| Model | Accuracy | Positive F1 | Negative recall | ROC-AUC |
|---|---:|---:|---:|---:|
| IMDb-trained Logistic Regression applied to Yelp | 85.84% | 85.82% | 83.14% | 0.9369 |
| Yelp word TF-IDF Logistic Regression | 91.64% | 91.22% | 93.19% | 0.9775 |
| Yelp word + character TF-IDF Logistic Regression | 92.44% | 92.09% | 93.66% | 0.9795 |

Reported engineering measurements: word model fit time 3.7 s; hybrid fit time 14.7 s; artifact sizes approximately 945 KB and 1.17 MB respectively. Verify hardware, versions and exact artifact files before publication.

**IMDb movie-review benchmark (separate dataset):**

| Model | Accuracy |
|---|---:|
| Logistic Regression + TF-IDF | 90.15% |
| Bi-LSTM | 84.67% |
| Fine-tuned BERT | 91.68% |

Do not compare IMDb accuracy against Yelp accuracy as if it is the same experiment. Do not show Yelp metrics for Bi-LSTM/BERT unless they were actually evaluated on that exact held-out Yelp test split.

### Controls

- Benchmark selector.
- `View confusion matrix`.
- `Dataset information`.
- `Export evaluation` only if report export exists.
- Model details disclosure.

### Model Lab restrictions

Do not display agreement between models unless multiple models are actually run on the same review and agreement is computed. Do not call an uncalibrated score a probability. Do not claim production accuracy from a public benchmark.

## 10 — Settings

**Reference:** `page_references/10_settings.png`  
**Purpose:** Manage real workspace and application preferences.

### Sections

- Workspace: workspace name and industry/segment if stored.
- Appearance: the approved brand defaults; optional Light/Dark/System only if all components support it consistently.
- Data & Privacy: retention, delete/export data and privacy controls only if implemented.
- Model preferences: default model selection only for models actually available in inference.
- Notifications: only supported notifications.
- Integrations: show connected integrations or a clearly labelled unavailable/coming-later state. Never show fake connected providers.

### Buttons/controls

- `Save changes` / `Update workspace`.
- Theme selector if implemented.
- Default model selector if implemented.
- Toggle controls with clear labels and persisted state.
- `Disconnect`/`Delete` actions require confirmation and actual backend support.

## Shared overlays and states

Implement reusable patterns for:

- Sign-in / create workspace (if auth exists).
- Import confirmation.
- Invalid CSV dialog or inline error.
- Cancel analysis confirmation, only if cancellation is supported.
- Mark as reviewed confirmation or toast.
- Assign-review dialog, only if assignment is supported.
- Toast success/error.
- Empty inbox, no search results, no insights available, no model evaluation available.
- API unavailable/retry state.

## Core action map

| Action | Expected result |
|---|---|
| Analyse reviews | Opens import/input journey |
| Upload CSV | Opens picker or accepts dropped file |
| Paste text | Switches to text mode |
| Try a sample | Loads explicitly labelled sample input |
| Continue | Opens CSV preview/validation or confirmed text submission |
| Start analysis | Calls actual inference workflow |
| Download report | Exports current run data |
| New analysis | Starts a fresh run without silently losing saved results |
| Import reviews | Opens import flow from Inbox |
| Search | Filters actual rows |
| Filters | Opens supported metadata/status filters |
| Review row | Opens Review detail |
| Add to review queue | Persists queue state, or is not shown |
| Mark as reviewed | Persists status, or is not shown |
| Assign | Persists assignment, or is not shown |
| View supporting reviews | Opens exact reviews behind an insight |
| Model benchmark selector | Switches to a distinct, clearly labelled evaluation dataset |
| Save settings | Persists the selected settings |
