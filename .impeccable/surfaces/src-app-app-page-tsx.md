---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: []
---

# Ekran „Dziś”

Mode: Operate. Primary surface of the app; the reason it exists (PRODUCT.md: „nie zapomnieć dawki”).

## Scope
Production screen: header (date, ‹ › day nav, calendar sheet, Edytuj), low-stock alert, slot cards, med detail bottom sheet, reorder mode. Leki/Zapasy/Ustawienia inherit the system later.

## Audience and task
Adult iPhone user, one hand, at a meal or before sleep, mostly in dark mode. Tick the current slot in seconds; see what is left today. 5–9 doses typical across 2–4 slots; test 1 and ~12 with long names and 3-package breakdowns.

## States
Slot: pending / partial / done (collapsed to one line, tap expands, stays in day order). Today and yesterday editable; older days read-only with untaken doses grey „pominięta”. Empty day. Low-stock alert: none / one / many. Offline banner. Optimistic tick that reverts with a message when saving fails.

## Anti-goals
Clinical look, gamification (no streaks, rings, motivational copy), small or dense targets, ornament.

## Direction contract
THESIS: The day is a column of soft cards, one per slot, and the one saturated colour on screen is always something you can press; it refuses the clinical grouped-list checklist and the motivational habit-tracker dashboard.
OWN-WORLD: Warm-tinted dark ground (#1A1816) with raised warm-graphite cards, large radii, generous padding; warm off-white text; orange (#FF8A3D dark / #FF7A45 light) reserved for actionable elements and filled checkboxes, dark text on orange; light theme is a warm-tinted ground with white cards. System sans (SF Pro) with Dynamic Type, tabular numerals.
STORY: The user sees today's date, sees the current slot card first with big rows, ticks doses or the whole slot, watches it fold into one line, and knows what remains for later.
FIRST VIEWPORT: Header with weekday + large date left, round ‹ › and calendar buttons right; optional low-stock row card; done slots as single-line cards („Przed śniadaniem ✓ 1/1”); current slot card with 22px med names, breakdown under each, round checkbox left, full-width orange „Odhacz całą porę”; next slot card peeking; fixed bottom bar Dziś · Leki · Zapasy with orange active tab.
FORM: digital-design-canon-warm-consumer-app-surface (dealt challenger, chosen by user over the assigned direction, third hand); signature interaction: tick fills the round checkbox with a soft spring and a finished slot folds to one line in place. seed:c211f064adac3931
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
