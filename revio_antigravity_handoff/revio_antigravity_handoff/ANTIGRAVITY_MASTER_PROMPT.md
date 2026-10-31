# MASTER PROMPT — Build Revio

**Estimated effort: HIGH**

You are acting as a senior product designer and frontend engineer. Redesign the existing sentiment-analysis project into **Revio**, a premium AI review-intelligence product. The supplied images are visual references. The written specification in this folder is the implementation source of truth.

## 1. Product intent

Revio helps a business understand customer feedback, identify recurring issues and decide which reviews deserve human attention. The product promise is:

> **Every review has a signal.**
>
> Turn customer feedback into clearer decisions. Understand sentiment, find recurring problems, and focus on what truly matters.

Do not position the product as a complete reputation-management suite unless integrations, response management, multi-location management and related capabilities genuinely exist.

## 2. Mandatory pre-implementation audit

Before changing code:

1. Inspect the actual local repository structure, package manifests, frontend entry points, Express routes, FastAPI routes, model artifact paths, database schema and existing tests.
2. Inspect `git status` and existing uncommitted changes. Preserve the user's local work. The current local workspace may be newer than the public GitHub `main` branch.
3. Run existing tests and record the baseline result.
4. Trace the real analysis request from browser → Express → FastAPI → model → response.
5. Identify which features are implemented, partially implemented, or absent. Do not infer capability from a design screenshot.
6. Write a short implementation plan and a list of files to modify before broad edits.

Do not overwrite the project with a template, create a new app alongside the old one, or replace the stack without a compelling technical reason.

## 3. Preserve the architecture

The known architecture is:

- Frontend: Vanilla HTML, CSS and JavaScript.
- API gateway: Express / Node.js.
- Inference service: FastAPI / Python.
- Existing model artifacts include Logistic Regression, Bi-LSTM and BERT variants.
- Prisma/SQLite has been used; PostgreSQL has also existed as an experimental configuration.

Verify these details in the local repository. Keep existing API contracts backward-compatible. Do not add React, Next.js, Tailwind or a heavy animation framework only to reproduce the references.

## 4. Visual design is locked

Follow `DESIGN_SYSTEM.md` and `design-tokens.css`:

- Public landing page: cinematic graphite background, editorial display headline, one large translucent glass/stone 3D sculpture, restrained ambient lighting.
- Authenticated application: warm ivory canvas, charcoal vertical sidebar, white/ivory surfaces, graphite text, muted separators, restrained violet primary actions and champagne details.
- Sentiment colors are semantic only: sage/green for positive, amber for mixed/uncertain, muted coral for negative.
- Keep one navigation system, one component language, one typography system, one spacing system and one motion system across every app page.
- Use large 3D art only where it adds value: landing hero and analysis processing. Do not place a decorative orb on every card or data page.
- No generic dark-neon gradients, glowing borders everywhere, excessive glassmorphism, random color themes, oversized dashboard KPI walls, or constant background particles.
- Use the page images as layout and visual references. Do not embed images of the interface as backgrounds. Build real HTML controls.

## 5. Required page sequence

Implement the following pages in the order given in `PAGE_SPECIFICATIONS.md`:

1. Public landing page.
2. Onboarding / import choice.
3. CSV preview and validation.
4. Analysis processing state.
5. Results overview.
6. Review inbox.
7. Individual review detail.
8. Insights.
9. Model Lab.
10. Settings.

Also implement the shared application shell, navigation, global search if supported, toasts, dialogs, empty states, loading states, error states and responsive layouts.

## 6. Functional requirement — every visible control must work

Every button, link, dropdown, tab, filter, pagination control, checkbox, upload target and menu must have a real outcome. Do not leave decorative or dead controls in the finished app.

Use the button labels and behaviors in `PAGE_SPECIFICATIONS.md`. Include all relevant states: default, hover, focus-visible, pressed, disabled, loading, success and error.

Where a backend action does not exist, do one of the following:

- implement it with the smallest safe, tested, backward-compatible change; or
- show it as disabled/not available and explain why.

Never present a nonfunctional control as an available product capability.

## 7. Data integrity and model truthfulness

- All review counts and sentiment percentages must be computed from the current batch or persisted dataset.
- Label sample data clearly as **Demo data**.
- Do not copy screenshot values into production UI.
- Do not call model accuracy a live customer metric.
- Show confidence only when the actual API response provides a valid value. Do not rename a raw score to probability unless it is calibrated and documented.
- Show `needs_human_review` only when the API returns the flag or a documented, tested rule produces it.
- Mixed/no-consensus must follow the actual API classification; do not invent a mixed class where the model only produces binary sentiment.
- Theme extraction, evidence highlights, suggested attention, assignment, review status persistence and automated insights must be hidden or marked unavailable until implemented and tested.
- Model comparisons must identify their dataset and test split. Never compare metrics from different datasets as if they were one experiment.
- No fabricated customer logos, integration status, productivity gains, savings, accuracy or processing-time claims.

Known user-reported benchmark results are recorded in `PAGE_SPECIFICATIONS.md`; verify matching local result files before displaying them.

## 8. Performance, accessibility and responsive behavior

- Keep ordinary controls in HTML/CSS/JS. Use CSS transitions for routine UI motion.
- Load 3D scenes lazily and only where needed. Provide a static fallback.
- Respect `prefers-reduced-motion`.
- Keep controls keyboard-operable with visible focus states and accessible names.
- Meet WCAG 2.2 AA contrast targets for text and controls.
- Test desktop, tablet and mobile layouts. No horizontal overflow, overlapping panels or clipped dialogs.
- Avoid layout-shifting animations. Prefer transform and opacity for motion.

## 9. Implementation order

**P0:** repository audit, design tokens, application shell, onboarding/import, CSV validation, real analysis workflow, results, review inbox, review detail, regression tests.

**P1:** landing-page 3D polish, insights, Model Lab, settings, refined motion, responsive and accessibility passes.

Do not spend the deadline on decorative effects while the core analysis workflow is incomplete.

## 10. Final deliverables

At completion, report:

1. Files changed and their purpose.
2. Pages/features implemented and any intentionally deferred.
3. API contracts used or changed.
4. Tests actually run and their results.
5. Manual browser checks actually completed.
6. Known limitations and unsupported controls.
7. Exact local launch steps.
8. Confirmation that existing inference still works.

A feature is complete only when it works end-to-end. A screenshot or a styled button is not proof of functionality.
