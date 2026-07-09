# Text handling — DRAFT spec

> **Status: DRAFT for Carl's review.** Open questions resolved with Carl are
> marked inline; a `DECISIONS.md` entry gets written once the whole thing is
> agreed and about to become code.

## Problem

Text appears everywhere. Two questions: (1) where does text styling live, and
(2) what does a content area (sidebar, table cell body) use to render a *mix* of
text blocks without re-inventing font rules each time.

## Proposal in one line

A small **`Text` component** exposing a **handful of semantic variants** (size +
line-height + weight only — **no colour**), backed by a **shared type scale in
tokens**. Component-owned text stays in each component's own CSS; composed
text-block areas use `Text`; **colour is always the container's call**, never
`Text`'s.

## The split (this is the core decision)

The trigger is **one fixed, intrinsic text role vs. a variable arrangement of
text blocks** — not "is it in a page".

- **Component-owned text** — the component has a *single, intrinsic* text role:
  a Button label, a TextField label/helper, a **table header (`th`)**. The role
  is fixed and there's exactly one, so the component's own CSS styles it, as
  today. It does *not* wrap its text in `<Text>`; it just uses the scale tokens.
  No change to these components beyond tokenising stray literals (below).
- **`Text` (composed text blocks)** — a content area that hosts a *variable
  arrangement* of text, where the composition itself is the point. The area
  component owns the layout (stacking, gaps); `Text` supplies the styled blocks
  it arranges. Driving cases:
  - **SidePanel / sidebar regions** — a panel stacks a heading + body copy +
    captions in arrangements that differ per use. The panel shouldn't bake a
    font rule per line; it composes `Text` blocks.
  - **Table cell content** — a cell with a **main** value and a **subtext**
    second line. The *cell component* owns the two-line layout, but composes two
    `Text` blocks (`body` main + `bodySmall`/`caption` subtext) rather than each
    cell type re-inventing its own font rules.

So `th` (the header) is component-owned; a *cell's* main/subtext content is
composed from `Text`. Same table, opposite sides of the split — because a header
is one fixed role and a cell body is a composed block.

## Type scale — faithful to the source app

The current app (`client/.../theme.ts`) is deliberately flat. Its entire
typography vocabulary — sizes shown in **rem** (all sizing is relative to the
root, principle #6; the source app's raw px are noted only as the origin):

The colour column below is the source app's *historical* colour — **`Text` does
not set it**; it's shown only to record where the app leaned secondary vs. body.
Colour is the container's responsibility (Q4).

| Source (MUI) | size (rem) | was (px) | line-height | weight | (was) colour | used for |
|---|---|---|---|---|---|---|
| `body1`    | `0.875rem` | 14 | 1.71 | normal | `--text-body` | default body text |
| `body2`    | `0.75rem`  | 12 | —    | 500    | `--text-secondary` | small / secondary |
| `h6`       | `1rem`     | 16 | —    | normal | `--text-secondary` | the app's one heading style |
| `th`       | `0.875rem` | 14 | —    | 700    | `--text-body` | table header |
| `subtitle1`| `1.2em`    | —  | —    | normal | inherit | occasional subtitle (relative on purpose) |
| `login`    | —          | —  | —    | —      | `--login-hero-text` | hero (already handled) |

Notes worth surfacing:
- There is **no h1–h5**. `h6` is the app's *one* heading style, used across many
  document ranks — dialog/modal titles (`ConfirmationModal`, `AlertModal…`,
  `StocktakeErrorModal`), section headings (`ItemVariantsTab`, `ReportWidget`,
  plugin `…Section`s) and error-alert headings. So it's a *visual* step, not a
  rank. **Q1 resolved (Carl):** keep one `heading` visual style; don't pin it to
  `<h6>` — the element comes from `level` (default `<h2>`, since it's usually the
  top heading in its region). Add bigger visual steps only by rule of three.
- Several `h6` sites override to bold (`fontWeight: 700`), a hint the bare
  400-weight heading reads too light — see the weight note under variants.
- The Page header title is its own thing, not this `heading` variant.

## Proposed `Text` variants

Names **resolved (Carl):** `body` / `bodySmall` / `heading` / `subtitle`. Each
variant is a **type style only** — size + line-height + weight, **no colour**
(Q4). `color: inherit`, so whatever the container sets cascades in.

| Variant       | Maps to  | size token            | weight               | default element |
|---------------|----------|-----------------------|----------------------|-----------------|
| `body`        | body1    | `--text-sm` (0.875rem)| `--weight-regular` (400) | `<p>`       |
| `bodySmall`   | body2    | `--text-xs` (0.75rem) | `--weight-medium` (500)  | `<p>`       |
| `heading`     | h6       | `--text-md` (1rem)    | `--weight-bold` (700)    | `<h2>` (rank via `level`) |
| `subtitle`    | subtitle1| `--text-sm` (0.875rem)| `--weight-semibold` (600) | `<p>` / `<span>` |

- **Base weight = 400 (Carl).** The showcase `body` text sets no weight and
  inherits the browser default (400) — see `index.css` `body` (font-family/size/
  line-height/colour but no weight). So `body` is `--weight-regular`.
- **`heading` weight = 700 (resolved).** The showcase's own headings all use
  `--weight-bold`, matching the source app's ad-hoc `fontWeight: 700` overrides
  on `h6`. So `heading` defaults to bold, not the source `h6`'s bare 400.
- **`subtitle` = `--text-sm`, semibold 600 (Q5 twice-revised with Carl,
  2026-07-09).** It's a *deck under a title*, a fixed step smaller than `heading`
  and distinguished from `body` by weight. Weight is **semibold**, matching the
  source app's near-universal `subtitle1 → 600` override (new
  `--weight-semibold: 600` token). **Kept a fixed rem step, not `em`:** `em`
  resolves against the *parent's* font-size, so a subtitle that is a *sibling*
  of its title can't size relative to it (the intermediate `0.85em` version only
  "worked" because the showcase container was set to the title's size — the
  container, not the title, was the base). Since the scale is flat (one heading
  size), relative sizing bought nothing real, so subtitle joins the rest of the
  scale as a plain rem step (principle #6).
  - **If a title+subtitle ever needs to scale as a unit**, wrap them and rescale
    the wrapper. Note plain `font-size: 90%` on a container does NOT cascade to
    rem-sized children (rem is always root-relative). The rem-correct knob is a
    **`--text-scale` multiplier**: define size tokens as
    `calc(<base> * var(--text-scale, 1))`, then a region sets `--text-scale: 0.9`
    to shrink its subtree in one line. **Recorded fallback, not built** (YAGNI
    until a real "this whole region is smaller" case appears — Carl, 2026-07-09).

Deliberately **excluded** (stay component-owned, not `Text` variants):
`th` (Table's own CSS), form `label`/helper (TextField's own CSS). **Resolved
with Carl** — these are single fixed roles, so their component styles them.

The **main + subtext** cell pattern is the archetypal `Text` consumer: `body`
(main) + `bodySmall`/`caption` (subtext) are the two workhorse variants. The
cell owns the vertical layout; `Text` owns the type. (Whether a thin
`CellText`/stack convenience wraps the two is a Table concern, not a `Text`
one — deferred.)

## Proposed API

```tsx
<Text>Default is body.</Text>                     // <p> body
<Text variant="bodySmall">Subtext line</Text>     // colour comes from container
<Text variant="heading" level={2}>Section</Text>  // <h2>, styled by variant
<Text as="span">inline</Text>                     // override element
```

- **Polymorphic `as`** — override the element without changing the visual style.
- **`level` for headings** — sets `<h2>`…`<h6>`; **decoupled from size** so
  visual size never dictates heading rank (WCAG 2.2 / principle #9). Size comes
  from `variant`, document rank from `level`.
- **No `tone`/colour prop (Q4 resolved).** `Text` sets no colour; it inherits.
  The container decides — e.g. a cell sets its subtext line to
  `color: var(--text-secondary)`, the sidebar sets its own. This keeps `Text`
  purely typographic and means colour lives with the context that has the
  contrast/meaning responsibility.

## Token work required

The "each area manages its own" drift is already visible — `Select` and
`FilterBar` hard-code `font-size: 1.25rem`, `1.125rem`, `1rem` and
`line-height: 1.3` in several places. Fold into tokens so the scale has one home:

- Add missing size/line-height tokens the components are currently inlining
  (`1.125rem`, `line-height: 1.3` at least).
- **Add `--weight-regular: 400`** (currently only `medium`/`bold` exist). Today
  the base 400 is implicit via browser default; `body`/`subtitle` should name it.
- One place to define the four variant styles (a `Text.module.css`), reused by
  components via the raw tokens.

## Accessibility rules (baseline, not optional)

- `heading` variant renders a real heading element; `level` keeps document
  outline correct independent of visual size.
- **Contrast is the container's responsibility** — since `Text` sets no colour,
  whatever context places it must ensure the inherited colour meets AA in both
  themes. Worth a note wherever containers set a non-default text colour.
- No meaning by colour alone — a secondary-coloured subtext must still read as
  subordinate by position/size, not colour only.

## Open questions — status

1. ~~**Heading hierarchy.**~~ **Resolved (Carl):** one `heading` visual style,
   element/rank via `level` (default `<h2>`), not pinned to `<h6>`. Bigger steps
   only by rule of three.
2. ~~**Scope of `Text`.**~~ **Resolved (Carl):** `Text` is for composed
   text-block areas (sidebar, cell main/subtext); single fixed roles (`th`, form
   `label`/helper) stay component-owned.
3. ~~**Naming.**~~ **Resolved (Carl):** `body` / `bodySmall` / `heading` /
   `subtitle`.
4. ~~**Colour.**~~ **Resolved (Carl):** no colour in `Text` at all — variants are
   type-only and inherit; the container specifies colour based on where the text
   is used.
5. ~~**`subtitle` size.**~~ **Resolved (Carl):** stays `em`, relative to its
   title/context.
6. ~~**Truncation / line-clamp.**~~ **Resolved (Carl):** deferred and *out of
   scope for `Text`* — a container concern (e.g. a table targets its cells'
   truncation rules), not a `Text` prop.

### All resolved — BUILT (2026-07-09)

Weights settled from showcase precedent: base/`body` = 400 (`--weight-regular`),
`bodySmall` = 500, `heading` = 700, `subtitle` = 600 (`--weight-semibold`).
`subtitle` sized to `--text-sm` — a fixed step smaller than `heading`, kept in
rem (not `em`) since siblings can't size off each other; region-scaling is a
recorded `--text-scale` fallback.

Shipped: `ui/Text` (+ `Text.module.css`), `--weight-regular`/`--weight-semibold`/
`--line-tight` tokens, a "Typography" showcase section, and the `DECISIONS.md`
entry (2026-07-09). **Follow-up still open:** fold the stray `Select`/`FilterBar`
`line-height: 1.3` (×11) and `1.125rem`/`1.25rem` literals into
`--line-tight` / size tokens — a visually-sensitive sweep left for its own pass.
