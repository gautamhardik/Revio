# Revio — Antigravity Design & Build Handoff

**Design direction:** Premium Editorial + Sculptural 3D  
**Effort estimate:** HIGH  
**Primary purpose:** Give Antigravity a coherent visual reference set and a precise product/interaction specification for implementing Revio in the existing repository.

## Start here

1. Read `ANTIGRAVITY_MASTER_PROMPT.md` first. Paste it into Antigravity along with this folder.
2. Read `DESIGN_SYSTEM.md` for the visual rules and reusable components.
3. Read `PAGE_SPECIFICATIONS.md` for the layout, actions, states and behavior of every page.
4. Use `page_references/` as visual references. Use the written specification as the source of truth whenever an image contains approximate text, sample numbers or details that conflict with the specification.
5. Use `design-tokens.css` as the initial CSS token foundation; adjust only when the existing repository architecture requires it.
6. Complete `ACCEPTANCE_CHECKLIST.md` before calling the redesign complete.

## Page reference images

| # | Screen | Image |
|---:|---|---|
| 01 | Public landing page | `page_references/01_landing_page.png` |
| 02 | Onboarding / import | `page_references/02_onboarding_import.png` |
| 03 | CSV preview / validation | `page_references/03_csv_preview_validation.png` |
| 04 | Analysis processing | `page_references/04_analysis_processing.png` |
| 05 | Results overview | `page_references/05_results_overview.png` |
| 06 | Review inbox | `page_references/06_review_inbox.png` |
| 07 | Review detail | `page_references/07_review_detail.png` |
| 08 | Insights | `page_references/08_insights.png` |
| 09 | Model Lab | `page_references/09_model_lab.png` |
| 10 | Settings | `page_references/10_settings.png` |

`approved_visual_overview.png` is the approved 3×3 visual direction. `csv_preview_reference_source.png` contains the additional CSV validation reference. The individual page images are enlarged crops from concept boards, not final pixel-perfect production screenshots; tiny text and sample metrics in them may be approximate.

## Product and engineering guardrails

- Preserve the current Vanilla HTML/CSS/JavaScript + Express + FastAPI architecture unless the repository audit identifies a specific, justified reason to change it.
- The local working tree may contain changes not present on GitHub `main`. Inspect and preserve local work before making edits.
- Do not retrain models just to redesign the interface.
- Do not hard-code demo metrics, fake reviews, fake integrations, fake customer logos or fabricated processing progress.
- Only display confidence, human-review flags, source metadata, themes, model comparisons or workflow statuses when they are returned by or derived from a tested implementation.
- The current backend/API behavior is the authority. Inspect actual schemas and routes before wiring UI controls.
- The page images are visual direction; this written handoff defines the expected behavior.
