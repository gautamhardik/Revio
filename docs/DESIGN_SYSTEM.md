# Revio Design System Specification
**Version:** 1.0.0  
**Status:** Assessment-Ready / Implemented  
**Theme:** Dark-First Cinematic Editorial Utility  
**Inspirations:** ThreeUI, Spline, Geist, Magic UI, React Bits  

---

## 1. Product Identity & Design Direction

**Revio** is a high-performance customer review intelligence and triage platform built on an extensible multi-model NLP architecture. It transforms subjective customer feedback into structured, evidence-backed sentiment classifications and operational risk scores.

### Design Direction: Cinematic Editorial Utility
- **Atmospheric Shell:** Zinc-950 base background (`#09090b`) with subtle depth gradations (`#18181b`, `#27272a`), evoking a focused command console.
- **High-Precision Data Displays:** High contrast typographic hierarchy paired with monospace data readouts (`Geist Mono` / `Space Mono` font stacks) for confidence metrics, latencies, and token weights.
- **Evidence-Driven Cues:** Word-level contribution tags ($\text{TF-IDF} \times \beta$) highlighted with translucent emerald (`rgba(34, 197, 94, 0.1)`) and rose (`rgba(239, 68, 68, 0.1)`) pills.
- **Zero-Dependency Vanilla Implementation:** Clean HTML5, CSS3 Custom Properties, and modular ES6 JavaScript without framework overhead or third-party bundle bloat.

---

## 2. Design Tokens

### Color Palette (Dark Theme — Zinc Base)

| Token Name | Hex / Value | Purpose / Usage |
| :--- | :--- | :--- |
| `--rv-bg-base` | `#09090b` (zinc-950) | Primary canvas background |
| `--rv-bg-raised` | `#18181b` (zinc-900) | Card and panel surfaces |
| `--rv-bg-overlay` | `#27272a` (zinc-800) | Secondary elevated cards, icon containers |
| `--rv-bg-subtle` | `#3f3f46` (zinc-700) | Progress bar tracks, muted borders |
| `--rv-border-default` | `#27272a` (zinc-800) | Subtle container and card borders |
| `--rv-border-strong` | `#3f3f46` (zinc-700) | Interactive borders, focus states |
| `--rv-text-primary` | `#fafafa` (zinc-50) | High-emphasis headlines, titles, values |
| `--rv-text-secondary` | `#a1a1aa` (zinc-400) | Body copy, secondary descriptions |
| `--rv-text-tertiary` | `#71717a` (zinc-500) | Meta captions, timestamps, unit labels |
| `--rv-text-disabled` | `#52525b` (zinc-600) | Disabled buttons and inputs |
| `--rv-accent` | `#3b82f6` (blue-500) | Primary brand accent and interactive CTA |
| `--rv-accent-hover` | `#2563eb` (blue-600) | Button hover states |
| `--rv-accent-muted` | `rgba(59,130,246,0.12)` | Subtle highlight backgrounds |
| `--rv-accent-text` | `#93c5fd` (blue-300) | Accent text on dark surfaces |
| `--rv-positive` | `#22c55e` (green-500) | Positive sentiment indicator |
| `--rv-positive-bg` | `rgba(34,197,94,0.1)` | Positive badge and chip background |
| `--rv-positive-text` | `#86efac` (green-300) | Positive text and cues |
| `--rv-negative` | `#ef4444` (red-500) | Negative sentiment / complaint indicator |
| `--rv-negative-bg` | `rgba(239,68,68,0.1)` | Negative badge and chip background |
| `--rv-negative-text` | `#fca5a5` (red-300) | Negative text and cues |
| `--rv-warning` | `#f59e0b` (amber-500) | Escalate / human review warning |
| `--rv-warning-bg` | `rgba(245,158,11,0.1)` | Escalate banner background |
| `--rv-warning-text` | `#fcd34d` (amber-300) | Escalate banner text |

### Typography Scale

Base font size: `16px` (`1rem`).

| Token | Size | Line Height | Usage |
| :--- | :--- | :--- | :--- |
| `--rv-text-xs` | `0.75rem` (12px) | `1.5` | Badges, timestamps, latency chips |
| `--rv-text-sm` | `0.875rem` (14px) | `1.5` | Body text, table cells, secondary labels |
| `--rv-text-base` | `1.0rem` (16px) | `1.5` | Primary body, inputs, buttons |
| `--rv-text-lg` | `1.125rem` (18px) | `1.3` | Card section titles |
| `--rv-text-xl` | `1.25rem` (20px) | `1.3` | Subheadings |
| `--rv-text-2xl` | `1.5rem` (24px) | `1.15` | Section headers |
| `--rv-text-3xl` | `1.875rem` (30px) | `1.15` | Overview greeting headline |
| `--rv-text-4xl` | `2.25rem` (36px) | `1` | Film verdict stamp |

### Spacing Scale (4px Modular Grid)
- `--rv-space-1`: `4px`
- `--rv-space-2`: `8px`
- `--rv-space-3`: `12px`
- `--rv-space-4`: `16px`
- `--rv-space-5`: `20px`
- `--rv-space-6`: `24px`
- `--rv-space-8`: `32px`

---

## 3. Information Architecture & Navigation

The application uses an agile single-page layout featuring a responsive left sidebar and a high-efficiency main display with hash routing (`#<section>`):

1. **Overview (`#overview`):**
   - High-level system vitals: Models Loaded, API Status, and Average Latency.
   - Quick Single-Review Analysis card for instant triage.
   - Recent Analyses stream populated dynamically from real inference events.
2. **Analyse Reviews (`#analyse`):**
   - **Single Review Mode:** Real-time business review evaluation with Yelp Word+Char LR, generating confidence bars, triage status, and individual token contribution chips.
   - **Batch Upload Mode:** Drag-and-drop CSV parser supporting `text`, `review`, or `comment` columns (up to 100 items), producing an aggregated triage summary and sortable results table.
   - **Film Review Ensemble Mode:** Preserves the legacy 3-critic IMDb ensemble (Logistic Regression, Bi-LSTM, BERT) with agreement voting and verdict stamp.
3. **Review Inbox (`#inbox`):**
   - Comprehensive log of all reviews evaluated in the active session.
   - Real-time search filter and sentiment chips (`All`, `Positive`, `Negative`, `Needs Review`).
4. **Insights (`#insights`):**
   - Proportional dual-color sentiment distribution bar.
   - Triage breakdown (Auto-Acknowledged vs. Escalated).
   - Frequency-ranked word contribution cloud.
5. **Model Lab (`#models`):**
   - Cross-domain audit comparison: IMDb movie reviews vs. Yelp business reviews.
   - Detailed specifications for all 4 models: parameter counts, Git LFS artifact sizes, and verified latencies.
   - Live health status pills fetched from `/api/v1/health`.
6. **Settings (`#settings`):**
   - Live endpoint verification (`/api/v1`).
   - Project metadata, version tag (`1.0.0`), and direct links to source code and legacy views.

---

## 4. Component Catalog

- **Buttons (`.rv-btn`):** Primary (`.rv-btn--primary`), Ghost (`.rv-btn--ghost`), and sizing modifiers (`--sm`). Integrated `.rv-spinner` for asynchronous loading states.
- **Sentiment Badges (`.rv-sentiment-badge`):** High-contrast chips with direction cues (`↑ Positive`, `↓ Negative`).
- **Triage Indicators (`.rv-triage-indicator`):** Explicit operational flags (`ESCALATE`, `AUTO-ACKNOWLEDGE`).
- **Word Contribution Chips (`.rv-word-chip`):** Monospace micro-chips display exact token weight contributions ($+\text{weight}$ or $-\text{weight}$).
- **Verdict Stamp (`.rv-verdict-stamp`):** Rotated cinematic review certification badge with glow effects.
- **Interactive File Drop Zone (`.rv-file-drop`):** Drag-and-drop CSV handler with file validation and row counting.
- **Toast Notifications (`.rv-toast`):** Animated sliding toasts for real-time user feedback.

---

## 5. Licensing & References

All UI components and CSS patterns are custom implementations designed specifically for Revio:
- **Icons:** Minimal inline SVG paths derived from the MIT-licensed Lucide / Heroicons icon sets.
- **Color Palettes:** Adapted from the open-source Tailwind CSS Zinc & System palettes (MIT License).
- **Typography:** Google Fonts Inter font family (SIL Open Font License 1.1) with system fallbacks.
- **Architectural Reference:** Design philosophy inspired by modern developer platforms (ThreeUI, Spline, Vercel Geist).

