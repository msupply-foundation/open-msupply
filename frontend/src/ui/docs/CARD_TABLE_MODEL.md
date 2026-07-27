# The Card/Table model — implementation reference

How to configure the shared [`DataTable`](../elements/table/DataTable.tsx) so one column list renders as a **table** (rows × columns), as a **card list** (one card per row), or both — and how each column places itself on the card. This is the API-first reference: what to write, what it does, and the common recipes. The interactive companion — this whole model rendered live, from the simplest three-prop table up to a sophisticated card — is the **Table & Card** showcase page ([`TableCardShowcase.tsx`](../../ui-showcase/TableCardShowcase.tsx), `#/showcase/table-card`). The design decisions and history live in [`TABLE_PLAN.md`](./TABLE_PLAN.md) § Phase 4; cell rendering/width presets live in [`CELL_TYPES.md`](./CELL_TYPES.md); the authoritative per-field types are in [`columnTypes.ts`](../elements/table/columnTypes.ts).

## The one idea to hold onto

**There is ONE column list.** Table view and card view are two renderings of the same `Column<T, K, G>[]`. A column decides, per view, whether it appears and where:

- In **table view** it's a normal column (header cell + body cell), unless `meta.hideOnTable` drops it.
- In **card view** it lands in the card **header** (if it declares `meta.headerPosition`) or the card **body** (otherwise, placed by its `cardGroup`), unless `meta.hideOnCard` drops it.

A value that must look different in each view is simply **two columns** — one table-only, one card-only — reading the same source field (see the "one value, two faces" recipe). You never fork the whole table config.

## Card anatomy

```
┌─────────────────────────────────────────────┐
│  [✓]  Primary title   #Primary2      Badge   │   ← HEADER
│       (headerPosition: 'primary')  ('badge') │
├─────────────────────────────────────────────┤   ← hairline
│  Default group   (ungrouped body cells)      │   ← BODY
│    Label   value       Label   value         │
│                                              │
│  📦 Group caption   (a declared cardGroup)    │
│    ┌───────────────── panel ──────────────┐  │
│    │  Label  value      Label  value      │  │
│    └──────────────────────────────────────┘  │
│                                              │
│  ▸ More details   (a disclosure group)       │   ← collapsed
└─────────────────────────────────────────────┘
```

- **Header** — the card's top row. `primary` cells sit inline-start (the identity/title; multiple primaries sit inline, in column order); `badge` cells sit inline-end (a chip/status). Header cells are **unlabelled by default**. A selection checkbox leads the row when `enableSelection`.
- **Body** — divided from the header by a hairline. Renders the **default (ungrouped) group first** (unpanelled, always shown), then each declared group in `cardGroups` list order. Body cells are **labelled by default** (label above value).
- **Groups** — a body group is a captioned block of its columns' fields. It can be boxed (`panel`) and/or wrapped in a disclosure/accordion (`disclosure`).

## Column-level API

Set on each column literal in your `columns()` array. Anything not about the card is the ordinary table column (see [CELL_TYPES.md](./CELL_TYPES.md)).

| Field                           | Type                   | Default       | Effect                                                                                                                                                                         |
| ------------------------------- | ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `c`                             | identity union         | —             | The column's identity (`{ key }` / `{ id }` / `{ accessor, id }`). Two columns must have **distinct** resolved ids. See [columnTypes.ts](../elements/table/columnTypes.ts).    |
| `header`                        | `string`               | —             | Table header text **and** the card field label (only a string header yields a label; a JSX header yields none).                                                                |
| `sortKey`                       | `K`                    | —             | Makes the column sortable. In card view it feeds the Sort control — read from **every** column regardless of view, so a table-only column can still supply a card sort option. |
| `cardGroup`                     | `G`                    | default group | Which body group this column joins in card view (typed; a typo is a compile error). Omit → the default ungrouped group. Ignored for header cells.                              |
| `meta.headerPosition`           | `'primary' \| 'badge'` | — (body)      | Puts the column in the card **header** — `primary` (title, inline-start) or `badge` (chip, inline-end). Omit → the column is a body cell.                                      |
| `meta.showLabel`                | `boolean`              | slot-based    | Override the card label. Default: header cells **unlabelled**, body cells **labelled**. Set `true` to caption a header cell, `false` to drop a body label.                     |
| `meta.hideOnCard`               | `boolean`              | `false`       | Omit the column from **card** view entirely (a table-only column).                                                                                                             |
| `meta.hideOnTable`              | `boolean`              | `false`       | Omit the column from **table** view entirely (a card-only column).                                                                                                             |
| `meta.hideFromColumnSettings`   | `boolean`              | `false`       | Keep the column out of the **Columns popover** (stays on screen, just not user show/hide/move/pin). For structural columns — the card identity, a row-actions column.          |
| `meta.align` / `meta.wrapLines` | —                      | —             | Table display only (text alignment, multi-line clamp). See [CELL_TYPES.md](./CELL_TYPES.md).                                                                                   |

`getCellDefinition(key, meta?)` merges its second argument into the column's `meta`, so card flags ride along with a preset: `...getCellDefinition('numberOfPacks', { headerPosition: 'badge', showLabel: true })`.

## Table-level API

Passed to `<DataTable>`.

| Prop                   | Type                                             | Effect                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cardGroups`           | `CardGroup<T, G>[]`                              | Declares each **body group's** presentation (below). Card-view only; table view ignores it.                                                                                                  |
| `showCardToggle`       | `boolean`                                        | Show the card⇄table toggle in the toolbar (above the 600px compact band). Needs `setConfig`. Omit for a table with no card view, or a card-only screen.                                      |
| `config` / `setConfig` | table config                                     | `config.viewMode` picks the view above the compact band (`'table'` default). Seed base-band `viewMode: 'card'` to default to cards. **Below 600px the table is always card**, toggle hidden. |
| `enableSelection`      | `boolean`                                        | Adds the leading selection checkbox to both views.                                                                                                                                           |
| `onRowClick`           | `(row) => void`                                  | Click-through on a row/card. Disclosure and inline-editing controls stop propagation so they don't trigger it.                                                                               |
| `rowState`             | `(row) => 'verified' \| 'warning' \| 'disabled'` | The row's **background** tint, mapped from the row's own facts — see [Row states & backgrounds](#row-states--backgrounds). **Table view only.**                                              |
| `rowTone`              | `(row) => 'info' \| 'error'`                     | The row's **text** colour (info / error) — same section. **Table view only.**                                                                                                                |

### `CardGroup<T, G>`

One entry per body group in `cardGroups`.

| Field               | Type                      | Default | Effect                                                                                                                                                      |
| ------------------- | ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`               | `G`                       | —       | The group id a column's `cardGroup` must match.                                                                                                             |
| `labelKey`          | `LocaleKey`               | —       | Group caption / disclosure header. Omit on the primary group (just its fields); omit on a disclosure → falls back to `table.more-details` ("More details"). |
| `icon`              | `() => JSX.Element`       | —       | Leading caption icon, **as a factory** (one node per card — never a shared element).                                                                        |
| `panel`             | `boolean`                 | `false` | Box the group's fields in a contained tinted "zone". Good for wide modal cards; off for small list cards.                                                   |
| `disclosure`        | `'open' \| 'closed'`      | —       | Wrap the group in an accordion. Omit → always shown (primary content). `'closed'` → collapsed (secondary content).                                          |
| `disclosurePreview` | `(row: T) => JSX.Element` | —       | Row-specific preview beside the disclosure header while collapsed. Only meaningful with `disclosure`.                                                       |

"Primary" vs "secondary" content is just: a group with **no** `disclosure` vs a group with `disclosure: 'closed'`.

## Label behaviour

The card label text is the column's string `header`. Whether and how it renders:

- **Body cell, labelled** (the default) → [`LabelledValue`](../elements/typography/LabelledValue.tsx): label **above** the value, in the field grid.
- **Header cell, labelled** (`showLabel: true`) → [`FieldRow`](../elements/inputs/FieldRow.tsx) `labelWidth="auto"`: label **beside** the control, on the identity row.
- **Unlabelled** (default for header cells, or `showLabel: false`) → the cell content fills its slot directly.

Read-only labelled values and editable inputs share the `--field-label-*` token, so a `LabelledValue` and a real input read identically in a card.

## Row states & backgrounds

A row's colour comes from two page-supplied functions, each a pure map from a row to a **semantic name** — never a colour (the CSS owns the palette, and colour never carries meaning alone: WCAG 2.2). Both are **table-view only**: in card view a selected card gets a blue border + faint fill, and neither function applies.

### `rowState` — the background tint

`rowState={(row) => 'verified' | 'warning' | 'disabled' | undefined}` tags each row with one of three fixed states — think **green / amber / grey** — from the row's own facts (a status field, a lock flag). What each looks like, and _when_:

| State      | Unselected | Selected                         |
| ---------- | ---------- | -------------------------------- |
| _(none)_   | white      | action **blue** (default select) |
| `verified` | **white**  | **green** — _replaces_ the blue  |
| `warning`  | **white**  | **amber** — _replaces_ the blue  |
| `disabled` | **grey**   | **grey** (unchanged)             |

Three things that trip people up:

- **`verified` / `warning` are selection-gated.** At rest the row is plain white — indistinguishable from a stateless row. The green / amber shows **only once the row is selected**. The row's status **chip** is what carries the meaning at rest; the tint is a selection-time reinforcement, not the primary signal — so `rowState` is only worth setting alongside `enableSelection`.
- **A state tint _replaces_ the selection blue — it never stacks.** A selected `verified` row is green, not blue-plus-green.
- **`disabled` is the exception — grey _always_**, selected or not (a read-only / spec-locked row; clickable read-only rows keep the grey even when selected).

Hover deepens whichever tint is showing by a couple of points; `disabled` stays flat.

### `rowTone` — the text colour

`rowTone={(row) => 'info' | 'error' | undefined}` is the orthogonal **text-colour** channel (not a background): `info` paints the row's text in the action-blue tone (a record awaiting an action — a placeholder / uncounted line), `error` in the error tone (a line the server refused). It composes on top of any `rowState` background.

### What a dev writes

The DataTable owns the tints, the selection-gating and the replaces-blue rule. The page owns **only** the row → state mapping:

1. Decide the states your row type can be in, from its **own** facts — a status field, a `readOnly` / lock flag, a set of "this one failed" ids.
2. Write `rowState` (and optionally `rowTone`) as a pure function — no per-view branching, no colours:

   ```tsx
   <DataTable
     enableSelection // verified/warning only show on selected rows
     rowState={row => {
       if (row.readOnly) return 'disabled'; // read-only wins → grey, always
       if (row.status === 'VERIFIED') return 'verified'; // green when selected
       if (row.status === 'ON_HOLD') return 'warning'; // amber when selected
       return undefined; // plain → blue when selected
     }}
     rowTone={row => (failedIds.has(row.id) ? 'error' : undefined)}
   />
   ```

3. Show the **same fact as a status chip** in a column too — the tint reinforces the chip, it is never the only signal.

Live: the **Row states & tints** demo on the [Table & Card showcase page](../../ui-showcase/TableCardShowcase.tsx) (`#/showcase/table-card`); assembled, the List page keys `rowState` off the shipment status.

## Recipes

### 1. A list card with a "More details" disclosure

The common list pattern: an identity title, a status badge, a few always-shown fields, and the rest tucked into one collapsed disclosure. (This is [TableShowcase.tsx](../../ui-showcase/TableShowcase.tsx).)

```ts
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Row, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' }, // no labelKey → "More details"
];

const columns = (): Column<Row, SortKey, GroupKey>[] => [
  // Card title (structural → out of the Columns popover):
  { c: { accessor: r => r.name, id: 'name' }, header: t('label.name'),
    ...getCellDefinition('otherPartyName',
      { headerPosition: 'primary', hideFromColumnSettings: true }) },
  // Badge, keeping its label:
  { c: { key: 'status' }, header: t('label.status'), cell: /* chip */,
    meta: { headerPosition: 'badge' } },
  // Always-shown default group (no cardGroup):
  { c: { key: 'createdDatetime' }, header: t('label.created'),
    ...getCellDefinition('createdDatetime') },
  // Secondary field → the disclosure:
  { c: { key: 'comment' }, header: t('label.comment'), cardGroup: 'more',
    ...getCellDefinition('comment') },
];

<DataTable columns={columns()} cardGroups={CARD_GROUPS} showCardToggle … />
```

Un-hiding columns that were previously responsive-hidden and routing them into a disclosure keeps them reachable on a phone without cluttering the card.

### 2. A card-only editable field

A field that only makes sense on the card (an inline input), absent from the table:

```ts
{ c: { id: 'note' }, header: 'Note',
  meta: { hideOnTable: true },
  cell: info => <TextField hideLabel … onClick={e => e.stopPropagation()} /> },
```

It renders in the default body group as a labelled field (its `header` is the label); `stopPropagation` keeps typing from triggering `onRowClick`.

### 3. One value, two faces

When a value renders differently per view, split it into a table column and a card column over the same source field. Example: the table shows a `#`-headed number cell; the card bunches it as `#1200` in the header.

```ts
// TABLE face — normal number column, hidden on the card; still owns sorting:
{ c: { key: 'invoiceNumber' }, sortKey: 'invoiceNumber', header: '#',
  ...getCellDefinition('invoiceNumber',
    { hideOnCard: true, hideFromColumnSettings: true }) },

// CARD face — a second primary header cell, distinct id, no sortKey:
{ c: { id: 'invoiceNumberCard' }, header: '#',
  meta: { headerPosition: 'primary', hideOnTable: true,
          hideFromColumnSettings: true },
  cell: info => <span>{`#${info.row.original.invoiceNumber}`}</span> },
```

Key points: **distinct ids** (both can't be `invoiceNumber`), the sortKey stays on **one** column (the card Sort control reads it across views), and both faces opt out of the Columns popover so the split is invisible to the user.

### 4. A card-only screen (no table view)

A line-edit modal or similar that is cards at every width: seed `viewMode: 'card'` in the base band, omit `showCardToggle`, and lean on `panel` + `disclosure` groups. (See the inbound/stocktake line-edit modals and [LineEditModal.tsx](../../ui-showcase/LineEditModal.tsx).)

```ts
type GroupKey = 'batch' | 'pricing' | 'other';
const CARD_GROUPS: CardGroup<Draft, GroupKey>[] = [
  { key: 'batch',   labelKey: 'label.batch',   icon: () => <StockIcon/>, panel: true },
  { key: 'pricing', labelKey: 'label.pricing', icon: () => <InfoIcon/>,  panel: true, disclosure: 'closed' },
  { key: 'other',   labelKey: 'heading.other', icon: () => <MessageSquareIcon/>, panel: true, disclosure: 'closed' },
];
```

## Rules of thumb

- **Ordering follows column order.** Multiple `primary` cells, default-group fields, and each group's fields all render in the order the columns appear in the array. Put the card column after the name column if you want it to follow the title.
- **Two columns → two ids.** Any pair of columns (the two-faces split especially) must resolve to distinct ids or TanStack collides.
- **`sortKey` is view-agnostic.** It's read off every column for the card Sort control, so a table-only column can still power a card sort — and a card-only display column needs no `sortKey`.
- **Structural columns opt out of the Columns popover** with `hideFromColumnSettings` — the identity title, a row-actions column, and either face of a two-faces split. (The selection checkbox is chrome gated by `enableSelection`, not a column, so it's never in the popover to begin with.)
- **Don't build a parallel card config.** Reach for `hideOnCard`/`hideOnTable` and a second column before you reach for anything that forks the column list per view.

## Known limitations

- **Column visibility is one shared axis, not per view** ([#551](https://github.com/msupply-foundation/open-msupply-frontend/issues/551)). `columnVisibility` gates **both** views — the card reads the same `getVisibleCells()` — so a column hidden by default is hidden in the table _and_ the card. The only per-view controls are the absolute `meta.hideOnTable` / `hideOnCard` (a column shown in exactly one view, never revealable in the other). There is no single-column state for _"default-hidden in the table but user-revealable, and always shown on the card"_: that needs the two-faces split — a table-face (`columnVisibility: false` default + `hideOnCard`) plus a card-face (`hideOnTable`, always on) — i.e. two column defs for one field. So a screen that wants a lean default table **and** a full card either shows all columns in the table by default (user hides what they don't want — what the stock list does today), makes the extra fields permanently card-only (`hideOnTable`, so they can never be table columns), or pays the two-faces cost.
- **The Columns popover isn't card-aware.** [`ColumnSettings`](../elements/table/ColumnSettings.tsx) is a table-shaped control — per-column Show/Hide + **Move up/down** + **Pin left/right** — and it's the same popover in both views (it only filters which columns it lists per view). In card view its vocabulary largely doesn't fit: **pin left/right is meaningless on a card**, and **move up/down** reorders the flat column list rather than expressing anything a reader recognises on the card. It works (visibility toggles apply, ordering still drives render order), but it reads as a table control bolted onto a card screen.
- **You can't move a column between groups from the popover.** A column's `cardGroup` (and its `headerPosition`) is declared in code and fixed at runtime — the popover has no notion of groups, so a user can't drag "Total" out of _More details_ into the always-shown content, or promote a body field into the header. Group membership is an author decision only.
- **What a card-aware popover would want:** group the listed columns **by their card group** (default group, then each declared group, with the disclosure/panel ones marked), let the user **move a column between groups** (re-assigning `cardGroup`, persisted via `setConfig` like visibility/order already are), drop pin-left/right in favour of card-relevant placement (header title vs badge vs which body group), and show the field the way the card will (label + sample value) rather than a bare column name. None of this exists yet — it's the natural next iteration once card view earns heavier per-user customisation.
