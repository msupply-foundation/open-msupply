# Component renaming candidates

A running list of UI components whose **names** are misleading or have drifted from what they actually do. Not for renaming piecemeal — the intent is one deliberate sweep in a later session (rename + update all call sites + docs together), so this file is the holding pen. Add a candidate whenever a name trips someone up; capture the _reasoning_ while it's fresh, plus a suggested alternative (the sweep can bikeshed the final choice).

Process for the sweep, when it happens: confirm the misnomer still holds, pick the final name, grep every import + usage + doc reference, rename, run `pnpm check`, render-verify the showcase. Keep test ids stable (they're a separate contract — [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md)).

## Candidates

### `LabelledValue` → e.g. `LabelledField` / `Field`

**Where:** [`src/ui/elements/typography/LabelledValue.tsx`](../elements/typography/LabelledValue.tsx)

**Why the name misleads:** it reads as "a read-only **value** with a label" — display-only data. But it's actually the generic **label + content** wrapper: in card view ([`CardView.tsx`](../elements/table/CardView.tsx) `FieldFlow`) it wraps the body **inputs** (NumberField, CurrencyField, Select, …), each rendered `hideLabel`, and supplies their visible label. Its label was deliberately made pixel-identical to input labels (the shared `--field-label-*` token) so a read-only value and an editable input read the same. So "Value" is wrong — the content is just as often an input. Its real job is "labelled field, label-above (stacked)".

**Suggested alternative:** `LabelledField` (keeps "labelled", drops the display-only "value" implication), or plain `Field` paired with `FieldRow` (see below) as the stacked-vs-inline pair. Decide against `FieldRow` in the sweep so the two read as a set.

### `FieldRow` → e.g. `InlineField` / `FieldInline`

**Where:** [`src/ui/elements/inputs/FieldRow.tsx`](../elements/inputs/FieldRow.tsx)

**Why the name misleads:** "Row" says _layout position_ (a row in a grid), not what it is. It's actually the **inline** counterpart of `LabelledValue` — label beside the control on one line — vs `LabelledValue`'s label-above. The meaningful distinction between the two is **stacked vs inline**, and neither name says so; "Row" vs "Value" obscures that they're the same concept (a labelled field) in two orientations.

**Suggested alternative:** name the pair by orientation so they read as siblings — e.g. `LabelledField` (stacked) + `InlineField` (inline), or `Field` + `FieldInline`. Whatever's chosen, pick both names together.

### Note — the pair should be decided together

`LabelledValue` and `FieldRow` are the **same concept** (a labelled field) in two layouts (stacked / inline). Today the names share nothing, which is why it's non-obvious that `FieldRow` is "the inline version of `LabelledValue`". The sweep should name them as an explicit pair rather than fixing each in isolation.

**Motivating gap — an inline read-only labelled value has no clean home.** The line-edit modal's "Unit" field is a read-only _value_ that needs an _inline_ label. Neither component fits cleanly: `LabelledValue` is stacked-only, and `FieldRow` implies a _control_. It's currently rendered with `FieldRow labelWidth="auto"` (a value in a "control row") as the least-bad option — see [`LineEditModal.tsx`](../../ui-showcase/LineEditModal.tsx). Whatever the pair becomes, it should cover all four cells of {stacked, inline} × {value, control}.
