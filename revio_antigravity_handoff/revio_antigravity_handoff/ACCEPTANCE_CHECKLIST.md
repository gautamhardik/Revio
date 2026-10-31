# Revio — Acceptance Checklist

## Repository safety
- [ ] Local changes were inspected and preserved.
- [ ] Current architecture and API contracts were documented.
- [ ] Existing tests were run before implementation.
- [ ] No framework migration or template overwrite occurred without justification.

## Design consistency
- [ ] Public landing uses the cinematic graphite treatment.
- [ ] Every authenticated page uses the same ivory canvas, graphite sidebar and topbar.
- [ ] Violet primary actions, champagne details and semantic sentiment colors are consistent.
- [ ] Same type scale, spacing, radii, borders, icon family and active-nav treatment across pages.
- [ ] No generic neon gradient backgrounds or excessive glow effects.
- [ ] Large 3D art is limited to meaningful areas and has a static fallback.

## Functionality
- [ ] Landing CTAs navigate to real destinations.
- [ ] CSV upload, validation, preview and error handling work.
- [ ] Text input works.
- [ ] Analysis calls the real API and displays actual results.
- [ ] Processing progress is honest and not fabricated.
- [ ] Results counts and percentages are computed from actual data.
- [ ] Inbox search, filters, sorting and pagination work.
- [ ] Review detail shows correct review, model output and metadata.
- [ ] Queue/review/assignment actions persist if shown.
- [ ] Insights are computed from actual data or show a truthful unavailable state.
- [ ] Model Lab identifies exact dataset and split.
- [ ] Settings persist or are not shown as interactive.
- [ ] No dead buttons, decorative fake controls or fabricated integrations remain.

## Data and model integrity
- [ ] Demo data is visibly labelled.
- [ ] No invented usage, accuracy, speed, ROI or customer metrics.
- [ ] Confidence is shown only when supplied by the model/API.
- [ ] Human-review status uses actual backend flag or documented/tested logic.
- [ ] Theme/evidence claims are backed by an implemented method.
- [ ] Yelp and IMDb benchmark results are kept separate.
- [ ] Public benchmark results are not presented as guaranteed customer performance.

## Accessibility and responsiveness
- [ ] Keyboard navigation works across all actions.
- [ ] Focus indicators are visible.
- [ ] Status is not conveyed by color alone.
- [ ] Reduced-motion preference is respected.
- [ ] Desktop checked at 1440, 1280 and 1024 px.
- [ ] Tablet checked at 768 px.
- [ ] Mobile checked at 390 px.
- [ ] No clipped menus, dialogs, text or horizontal overflow.

## Delivery
- [ ] Tests run after changes and results recorded.
- [ ] Main user journey manually tested end-to-end.
- [ ] Documentation and launch instructions updated.
- [ ] Known limitations disclosed.
- [ ] Temporary/build/scratch artifacts cleaned up.
