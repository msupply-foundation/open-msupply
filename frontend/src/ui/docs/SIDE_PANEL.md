# Side panel contract

> **Binding.** This is a contract, not a suggestion. Any code that builds or edits a detail-view side panel — in a vertical (`src/sections/**`) or elsewhere — MUST follow every rule below. Read it in full before you write or change a panel. If a requirement here can't be met for a real reason, stop and raise it rather than quietly diverging; if a genuinely new pattern is needed, add it here first, then use it. A panel that breaks these rules is a defect, the same as a failing check.

How to compose a detail-view side panel (`ui/layout/SidePanel`) so every panel reads the same without each vertical re-deriving the look. Live references: [`InboundShipmentSidePanel`](../../sections/inbound-shipments/detail/InboundShipmentSidePanel.tsx) and [`OutboundSidePanel`](../../sections/outbound-shipments/detail/OutboundSidePanel.tsx); demo at `#/showcase/side-panel`. Component ledger entry: [UI_ELEMENTS.md](./UI_ELEMENTS.md).

The philosophy is the repo's [explicit-composition](../../../kdd/explicit-composition/draft-kdd.md) one: there is **no** config-driven panel that renders itself from a field list. You compose the parts — but the parts are shaped so the only way to compose them is the right way, and the panel's own CSS does the rest. This doc is the spec for the handful of choices CSS can't make for you.

## What the panel enforces for free

Compose `SidePanelSection` + `FieldRow` + `SidePanelSubheading` + `SidePanelActions` and `SidePanel.module.css` gives you all of this with **zero per-panel styling** — you cannot get it wrong because you never write it:

- **Values align in one column.** Every `FieldRow` in a section shares a fixed 8rem label track (`--field-row-label`); a long label wraps within it instead of shoving its value right.
- **Compact vertical rhythm.** Tight in-row line-height (a wrapped label's lines hug) with a real `gap` between rows — the two are decoupled, so neither fights the other.
- **Sub-headings.** `SidePanelSubheading` is a bold ruled `<h3>` with the right space above (a group break) and below, and an inline-end `action` slot.
- **Calculated helper text reads as a value.** A field's `helperText` is non-muted in the panel (`--field-helper-color`), and on a helper row the label centres on the _input_, not the input+helper block.
- **Popovers don't inherit bold** from a heading they sit inside.
- **Collapsed sections** sit flush with no dangling gap; the **actions section** pins to the panel's foot.

## The rules (the choices that are yours)

1. **Group headings use `SidePanelSubheading`** — never a `FieldRow` with a bold label. Pass an `action` for a group-level edit; use the info-tooltip-after-heading pattern (below) when the group needs a gloss.
2. **Single-line inputs are `size="small"`; the width splits by content.** A **short-value** input (a percentage, a date, a code, an id) is `width="compact"` — the narrowest cap. A **free-text** input (a name, a reference, a note) is `width="full"` so it can hold a longer value; `compact` would clip it. Multi-line text (a comment) is a `TextArea` (`width="full"`, no size). Never leave a single-line input at default height, or a free-text field at `compact`.
3. **A calculated figure that belongs to an input is its `helperText`** (sits below the input), never a value floated to the right of the row — that breaks the value-alignment column.
4. **Inline edit affordances are small icon-only** `IconButton`s (`bordered size="small"`), pinned to the row's inline-end. Never a text `Button` with an "Edit" label inside a row.
5. **Record actions go in the last section** (`value="actions"`, `title={t('heading.actions')}`) inside `SidePanelActions` — labelled buttons, one per row, Delete first. This cluster is the one place labelled buttons belong.

## Anatomy

```
SidePanel label=… onClose=…                       ← <aside>, sticky header + own scroll
├─ SidePanelSection value=… title=… collapsible    ← an <h2>, sections stack top→bottom
│  ├─ FieldRow label=…            → value / control      (label : value row)
│  ├─ SidePanelSubheading action=…  → group of FieldRows (bold ruled <h3>)
│  └─ …
└─ SidePanelSection value="actions" title=…         ← pinned at the panel's foot
   └─ SidePanelActions            → Delete · Make a copy · Copy to clipboard
```

## Field recipes (copy these)

**Read-only value**

```tsx
<FieldRow label={t('label.created')}>
  <span>{localisedDate(node.createdDatetime)}</span>
</FieldRow>
```

**Value + inline edit action** (action pinned far inline-end):

```tsx
<FieldRow label={t('label.donor')}>
  <span
    style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      'inline-size': '100%',
    }}
  >
    <span>{node.defaultDonor?.name ?? t('label.none')}</span>
    <IconButton
      bordered
      size="small"
      icon={<EditIcon />}
      label={t('label.edit')}
      onClick={openDonor}
    />
  </span>
</FieldRow>
```

**Percentage input with its calculated amount** (amount as helper text):

```tsx
<FieldRow label={t('label.tax')}>
  <NumberField
    label={t('label.tax')}
    hideLabel
    size="small"
    endAdornment="%"
    value={taxPct()}
    min={0}
    max={100}
    helperText={money(taxAmount())}
    onChange={v => setTax(v ?? 0)}
  />
</FieldRow>
```

**Group heading, with an optional gloss and edit action:**

```tsx
<SidePanelSubheading
  action={
    <IconButton
      bordered
      size="small"
      icon={<EditIcon />}
      label={t('…')}
      onClick={openEditor}
    />
  }
>
  {/* info icon AFTER the text; the popover text stays regular weight */}
  <span style={{ display: 'inline-flex', 'align-items': 'center' }}>
    {t('heading.service-charges')}
    <InfoTooltip
      text={t('messages.service-charges-description')}
      label={t('heading.service-charges')}
      placement="bottom-start"
    />
  </span>
</SidePanelSubheading>
```

**Entered by / Edited by** — the recorded user, via `UserLabel` (never hand-rolled: the name renders a dash when there is no user, and the email — when known — sits behind the shared info affordance; `label` is the row's own field label so the icon's accessible name says which row it details):

```tsx
<FieldRow label={t('label.entered-by')}>
  <UserLabel
    username={node.user?.username}
    email={node.user?.email}
    label={t('label.entered-by')}
    testId="entered-by-field"
  />
</FieldRow>
```

**Comment** — always multi-line:

```tsx
<FieldRow label={t('label.comment')}>
  <TextArea
    label={t('label.comment')}
    hideLabel
    width="full"
    value={edit.state.comment}
    disabled={disabled}
    onInput={e => edit.setField('comment', e.currentTarget.value)}
    onBlur={() => edit.flush()}
  />
</FieldRow>
```

## Known open items

- **Totals row** ("Grand total") is still ad-hoc bold and inconsistent between panels (inbound bolds label + value; outbound only the label). No standard treatment yet — pick one and, if it recurs, promote it (a `SidePanelSubheading`-style total row) rather than re-inlining `<strong>`.

## Sign-off checklist

Before considering a panel done, confirm every item — this is the contract:

- [ ] Group headings are `SidePanelSubheading`, not a `FieldRow` with a bold label (rule 1).
- [ ] Every single-line input is `size="small"` — `width="compact"` for a short value (%, date, code), `width="full"` for free text (name, reference, note); comments are `TextArea` (rule 2).
- [ ] Any figure calculated from an input is that input's `helperText`, not a value to its right (rule 3).
- [ ] Inline edit affordances are small icon-only `IconButton`s, inline-end (rule 4).
- [ ] Record actions are labelled buttons in the last `value="actions"` section (rule 5).
- [ ] `pnpm check` is green **and** the panel has been rendered (showcase or vertical) — value alignment and helper/label centring are visual and the type-check can't see them.
