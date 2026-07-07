# UI elements — what each is built from

A living ledger of every UI element built in this app and **what went into it** — hand-rolled plain HTML/CSS vs. a headless library part, and *why* a library was used where it was. Update this whenever an element is added or its composition changes. (Same convention as the RnD prototype's `UI_ELEMENTS.md`.)

> **Convention.** Default is **hand-rolled**: plain semantic HTML + CSS Modules + design tokens (`src/styles/tokens.css`), sized in rem. We reach for a **headless** primitive only where the widget has a real accessibility/interaction contract that's tedious and risky to hand-roll (and that WCAG 2.2 grades). When we do, **we still own all the markup and CSS** — the library supplies behaviour + ARIA, not a look.

## Elements

| Element / part | Built with | Headless dep — and why |
|---|---|---|
| **Storybook shell** — header, section nav, panel | Hand-rolled (`App.tsx`: grid layout, `<nav>`/`<ul>`/`<a>` with `aria-current`) | — Active section lives in the URL hash (`#/buttons`) via plain anchors + one `hashchange` listener; no routing library (routing is undecided). |
| **Theme toggle** (sun/moon) | Hand-rolled (`components/ThemeToggle`) | — Just a `<button>` (with `aria-pressed`) that flips `data-theme` on `<html>` and persists to `localStorage`; a pre-paint script in `index.html` prevents a light flash. The `[data-theme='dark']` token block in `tokens.css` recolours everything via the cascade. |
| **Select** — styled drop-down (`components/ui/Select`) | Our markup + CSS over Kobalte parts (Trigger/Value/Content/Listbox/Item) | **Kobalte Select** — options need rich content (status dot, two-line label) a native `<option>` can't hold, and the replacement is a full `role="listbox"` popup with typeahead + keyboard/focus semantics that WCAG 2.2 grades. Solid analogue of the prototype's Radix Select; styled via `data-*` state attributes. API mirrors the prototype (string `value` in/out). |
| **Combobox** — autocomplete (`components/ui/Combobox`) | Our markup + CSS (search icon, hand-rolled clear button) over Kobalte parts | **Kobalte Combobox** — THE buy-don't-build widget (`aria-activedescendant` virtual focus, SR announcements, arrow/Enter/Escape semantics). Replaces Downshift `useCombobox`; upgrade over the prototype: popup is portaled with collision-aware, control-width placement. We supply the (locale-aware, code-or-name) filter predicate. |
| **MultiSelect** — multi-select autocomplete (`components/ui/MultiSelect`) | Our markup + CSS (tags rendered via Kobalte's Control render-prop state) over Kobalte parts | **Kobalte Combobox `multiple`** — replaces Downshift `useMultipleSelection`+`useCombobox`. Backspace removes the last tag, menu stays open across picks (Kobalte defaults). Delta from the prototype: picked items stay in the list check-marked (click to deselect) instead of dropping out — see `DECISIONS.md` 2026-07-07. |
| **Icons** (`components/icons`) | Hand-rolled plain SVG (chevron, check, close, search) | — Same Fill/Stroke `currentColor`/`1em` convention as the prototype's icon set (itself ported from the app's MUI SvgIcons); only the icons actually in use, added as needed. |

## Cross-cutting (not a single element)

- **Design tokens** — `src/styles/tokens.css`, ported from the RnD prototype (itself a faithful port of the current app's `theme.ts`), restructured with an enforced **theme contract** region (see `DECISIONS.md` 2026-07-06). Includes the dark theme with the inverted-surface elevation model (`--surface-raised`, near-black dark shadows).
- **Root stylesheet** — `src/index.css`: box-sizing reset, the single root font-size knob (rem scaling; phone < 600px drops root to 85%), body defaults from tokens, Inter Variable via `@fontsource-variable/inter`.
- **CSS integrity tooling** — `npm run check`: typed-css-modules `.d.ts` generation → `tsc -b` → stylelint (incl. unknown-`var()` detection against `tokens.css`) → theme-contract script. See `DECISIONS.md` (2026-07-06).

## Dependencies

- **Runtime:** `solid-js`, `@fontsource-variable/inter` (font asset only), `@kobalte/core` (headless behaviour + ARIA for the selector family — provisional, see `DECISIONS.md` 2026-07-07).
- **Dev-only tooling:** `typed-css-modules`, `stylelint` (+ `stylelint-config-standard`, `stylelint-value-no-unknown-custom-properties`), `concurrently`.

_Keep this table in sync as elements are built or change._
