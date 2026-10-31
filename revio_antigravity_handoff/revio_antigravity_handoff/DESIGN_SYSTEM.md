# Revio Design System

## 1. Design identity

**Name:** Revio  
**Descriptor:** Review intelligence  
**Tagline:** Every review has a signal.  
**Design direction:** Premium Editorial + Sculptural 3D.

The visual language combines a cinematic public-facing brand experience with a quiet, light, high-clarity working application. It should feel crafted, confident, calm and intelligent—not like a generic AI dashboard.

### Two connected environments

| Environment | Visual treatment | Purpose |
|---|---|---|
| Public marketing site | Graphite/near-black, warm white typography, sculptural glass/stone 3D, restrained violet and champagne | Explain the product and earn the first action |
| Authenticated application | Warm ivory canvas, charcoal sidebar, pale surfaces, graphite text, violet actions | Help users analyse, inspect and act on reviews for long sessions |

These are two deliberate modes of one brand, not unrelated color themes. The app's internal pages must all share identical shell, sidebar, topbar, spacing, typography and control styling.

## 2. Color tokens

Use `design-tokens.css` as the starting point. Suggested palette:

### Brand and surfaces

| Token | Value | Usage |
|---|---|---|
| `--revio-ink` | `#1E1D20` | Sidebar and core dark surfaces |
| `--revio-ink-deep` | `#131316` | Marketing background |
| `--revio-canvas` | `#F3EFE7` | Authenticated app canvas |
| `--revio-surface` | `#FFFCF7` | Main cards and content surfaces |
| `--revio-surface-muted` | `#EEE9E0` | Secondary panels and controls |
| `--revio-border` | `#E1DBD1` | Fine borders and dividers |
| `--revio-text` | `#242226` | Primary app text |
| `--revio-text-muted` | `#77716C` | Secondary text and metadata |
| `--revio-violet` | `#8970D6` | Primary action and active state |
| `--revio-violet-hover` | `#775FC3` | Hover/pressed primary |
| `--revio-violet-soft` | `#EEE8FA` | Selected surface and soft highlight |
| `--revio-champagne` | `#C7A77A` | Decorative and secondary accent |

### Semantic status colors

| Status | Suggested value | Usage |
|---|---|---|
| Positive | `#2F806A` | Positive sentiment and success |
| Mixed / uncertain | `#B57A37` | Mixed, ambiguous or uncertain state |
| Negative | `#C7656D` | Negative sentiment and error |
| Neutral/info | `#58728E` | Informational state |

Use semantic colors sparingly and consistently. Always combine color with text/icon labels; never rely on color alone.

## 3. Typography

- **Marketing display:** a restrained high-contrast serif such as DM Serif Display or a suitable system serif. Use for one hero headline and occasional editorial moments only.
- **Application UI:** Geist Sans or a close, readable sans-serif. Use for navigation, titles, body text, controls and tables.
- **Technical metadata:** Geist Mono or a system monospace, used sparingly for IDs, timestamps, model values and confidence scores.

Suggested scale:

| Role | Desktop size | Weight |
|---|---:|---|
| Landing headline | 60–72 px | 500–600 |
| App page title | 32–36 px | 600 |
| Section title | 20–24 px | 600 |
| Card title | 16–18 px | 600 |
| Body | 14–16 px | 400–500 |
| Label | 12–13 px | 500–600 |
| Metadata | 11–12 px | 400–500 |

Do not use the display serif for tables, dense settings, navigation or button labels. Maintain line length and line-height for comfortable reading.

## 4. Layout and geometry

Use a 4 px spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.

Desktop application shell:

- Sidebar width: 232–248 px (target 240 px).
- Topbar height: 64–72 px (target 68 px).
- Main content max width: 1,280–1,360 px.
- Main page padding: 28–36 px (target 32 px).
- Standard card radius: 14–18 px.
- Input/button radius: 10–12 px.
- Standard card padding: 20–24 px.
- Table row height: 52–60 px, depending on content.
- Use a clear 12-column or equivalent responsive grid; avoid arbitrary offset panels.

Landing page:

- Header: 72 px high, max content width approximately 1,280 px.
- Hero: two-column composition, approximately 46% text / 54% 3D visual on wide screens.
- Headline width: 580–640 px maximum.
- Main CTA is visually dominant; secondary CTA is outlined/quiet.
- Social proof/logos only when genuinely authorised; otherwise use neutral industry labels or omit.

## 5. Application shell

### Sidebar

Fixed on desktop; collapsible on tablet; drawer/bottom navigation on mobile if required.

Order:
1. Revio wordmark.
2. Analyse.
3. Review Inbox.
4. Insights.
5. Model Lab (may be hidden from non-admin/business users if it is an internal evaluation tool).
6. Settings.
7. Workspace switcher at bottom, if supported.

Active navigation: pale violet/soft neutral selection with violet icon or a subtle left indicator. Keep all other links quiet.

### Topbar

- Breadcrumb or page context on the left.
- Global search only if functional.
- Help/notification controls only if destinations/actions exist.
- Avatar/workspace menu on the right.
- No decorative icon without an action or accessible label.

## 6. Component specifications

### Buttons

1. Primary: 44–48 px high; violet fill; high-contrast label; optional leading/trailing icon; subtle shadow only on primary CTAs.
2. Secondary: surface/transparent fill; thin border; neutral text.
3. Tertiary: text action; no heavy container.
4. Destructive: muted coral treatment with explicit wording and confirmation for irreversible actions.
5. Icon-only: 36–40 px square; accessible name and tooltip; visible focus ring.

All applicable buttons require: default, hover, focus-visible, pressed, disabled, loading, success/error feedback. Avoid scaling buttons dramatically; a subtle 1–2% press response is enough.

### Form controls

- Input height 44 px target.
- Textarea has visible label, helper text and character count only if there is a real max length.
- Selects expose selected value and focus state.
- File dropzone has idle, drag-over, uploaded, validating, invalid and accepted states.
- Inline errors explain how to fix the problem.

### Data components

- Sentiment badge: icon + explicit label.
- Confidence: show only if provided; identify it as a model score/confidence and provide a tooltip explaining interpretation.
- Human-review badge: show only when backend flag or documented rule is present.
- Review list: dense, aligned, scan-friendly rows; keep source/date columns only when available.
- Charts: clear axis labels, tooltips, readable legends and text summaries.
- Insight/theme item: show count/share only if backed by computed data; provide supporting review samples.

### Feedback components

- Toast: short, specific result; disappears only after a reasonable interval; errors persist until acknowledged if action is needed.
- Modal: clear title, concise explanation, explicit primary and secondary action; Escape closes only when safe.
- Drawer: for secondary detail without losing list context.
- Empty state: explain what belongs here and provide one next action.
- Skeleton: match final content geometry; never use a skeleton indefinitely.

## 7. Motion system

Motion should feel precise and physical, never noisy.

| Token | Duration | Usage |
|---|---:|---|
| Fast | 120–160 ms | Button, icon and chip feedback |
| Standard | 160–200 ms | Tabs, menus, hover/focus state |
| Panel | 200–260 ms | Drawer, modal, page content transition |
| Hero | 350–550 ms | Landing entrance and major scene transition |
| Ambient 3D | 12–20 s loop | Slow landing-page object movement |

Recommended behavior:

- Landing object: subtle rotation, gentle parallax (very small movement), natural reflection/light change; no constant particle storm.
- Analysis processing: sculpture subtly contracts/opens or rotates with each real processing stage; no fake 0–100% progress.
- App page changes: short fade/translate of 6–10 px; no long cinematic page transition on daily tasks.
- Buttons: small background/border change and 1–2% press response.
- Charts: reveal on first display only; avoid replaying elaborate animations every time filters change.
- Respect `prefers-reduced-motion`; disable nonessential movement and use static artwork.

## 8. 3D art direction

Signature visual: a translucent sculptural form made of layered glass, polished mineral, or brushed metal, with warm internal light and restrained lavender/champagne refractions. The form should feel like a designed physical object, not a generic neon AI orb.

Use:

- One large object in the public landing hero.
- A small quiet version in onboarding only if it does not compete with import controls.
- A central evolving object in processing only.
- No large 3D decoration on inbox, settings, tables, or Model Lab.

Use a static poster/fallback on low-power devices, unsupported browsers and reduced-motion mode. Load 3D lazily and avoid blocking the primary interaction.

## 9. Responsive behavior

Test widths: 1440, 1280, 1024, 768 and 390 px.

- Desktop: fixed sidebar and wide content.
- Tablet: collapsible sidebar and reflowed two-column content.
- Mobile: single-column layout, sidebar drawer or bottom nav, touch-friendly controls, table row detail screen/drawer, no clipped dialogs.
- Charts must reflow or become horizontally scrollable with a clear affordance.
- The landing hero stacks headline then 3D art; do not shrink text until unreadable.

## 10. Accessibility

- Aim for WCAG 2.2 AA contrast for text and controls.
- Use semantic landmarks, headings, labels, button names, table headers and status announcements.
- All actions keyboard-operable, with visible focus.
- Do not use color as the only status signal.
- Announce upload and analysis state changes to assistive technology.
- Respect reduced motion.
- Keep reading order logical when columns collapse.
