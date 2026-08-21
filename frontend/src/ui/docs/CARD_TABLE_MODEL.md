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

- **Header** — the card's top row. `primary` cells sit inline-start (the identity/title; multiple primaries sit inline, in column order); `badge` cells follow — **status flags (`data-flag`) directly after the title**, anything else (an actions cluster) pushed to the inline-end corner. Header cells are **unlabelled by default**. A selection checkbox leads the row when `enableSelection`.
- **Body** — divided from the header by a hairline. Renders the **default (ungrouped) group first** (unpanelled, always shown), then each declared group in `cardGroups` list order. Body cells are **labelled by default** (label above value).
- **Groups** — a body group is a captioned block of its columns' fields. It can be boxed (`panel`) and/or wrapped in a disclosure/accordion (`disclosure`).

## Column-level API

Set on each column literal in your `columns()` array. Anything not about the card is the ordinary table column (see [CELL_TYPES.md](./CELL_TYPES.md)).

| Field                           | Type                   | Default       | Effect                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c`                             | identity union         | —             | The column's identity (`{ key }` / `{ id }` / `{ accessor, id }`). Two columns must have **distinct** resolved ids. See [columnTypes.ts](../elements/table/columnTypes.ts).                                                                                                            |
| `header`                        | `() => JSX.Element`    | —             | Table header text **and** the card field label. Function-only (so the text re-resolves on a locale change); the card + Columns popover + card Sort menu all call it.                                                                                                                   |
| `meta.textLabel`                | `() => string`         | — (`header`)  | The column's name **in words**, for a column whose grid header is empty or **iconic** (the comment glyph, the line editor's auto-allocation tick). Used wherever the icon can't stand in: the Columns popover row and the card field caption. Columns with a text header don't set it. |
| `sortKey`                       | `K`                    | —             | Makes the column sortable. In card view it feeds the Sort control — read from **every** column regardless of view, so a table-only column can still supply a card sort option.                                                                                                         |
| `cardGroup`                     | `G`                    | default group | Which body group this column joins in card view (typed; a typo is a compile error). Omit → the default ungrouped group. Ignored for header cells.                                                                                                                                      |
| `meta.headerPosition`           | `'primary' \| 'badge'` | — (body)      | Puts the column in the card **header** — `primary` (title, inline-start) or `badge` (chip, inline-end). Omit → the column is a body cell.                                                                                                                                              |
| `meta.showLabel`                | `boolean`              | slot-based    | Override the card label. Default: header cells **unlabelled**, body cells **labelled**. Set `true` to caption a header cell, `false` to drop a body label.                                                                                                                             |
| `meta.hideOnCard`               | `boolean`              | `false`       | Omit the column from **card** view entirely (a table-only column).                                                                                                                                                                                                                     |
| `meta.hideOnCardWhen`           | `(row) => boolean`     | —             | Omit this field from the cards of the **rows** it answers true for — the per-row counterpart of `hideOnCard`. Card view only; see [Withdrawing a field per row](#withdrawing-a-field-per-row).                                                                                         |
| `meta.hideOnTable`              | `boolean`              | `false`       | Omit the column from **table** view entirely (a card-only column).                                                                                                                                                                                                                     |
| `meta.hideFromColumnSettings`   | `boolean`              | `false`       | Keep the column out of the **Columns popover** (stays on screen, just not user show/hide/move/pin). For structural columns — the card identity, a row-actions column.                                                                                                                  |
| `meta.cardWidth`                | `number` or range      | — (equal)     | This field's width **range** in **card** view, per ui-standards § _Field Widths by Context_ › _By Content Type_ (numeric quantity `7.5–9`, currency `10–12`, lookups `12.5–36`). See below.                                                                                            |
| `meta.cardSpan`                 | `number`               | `1`           | Tracks this field takes of its group's `narrowLayout.columns` equal-track grid (≤1023px viewports only); ignored in every other layout. See [Field widths](#field-widths-metacardwidth).                                                                                               |
| `meta.align` / `meta.wrapLines` | —                      | —             | Table display only (text alignment, multi-line clamp). See [CELL_TYPES.md](./CELL_TYPES.md).                                                                                                                                                                                           |

`getCellDefinition(key, meta?)` merges its second argument into the column's `meta`, so card flags ride along with a preset: `...getCellDefinition('numberOfPacks', { headerPosition: 'badge', showLabel: true })`.

### Field widths (`meta.cardWidth`)

A group's fields default to **equal auto-fit tracks** — fine for a list card's handful of read-only values, wasteful on a wide editor card. `repeat(N, 1fr)` is only right when every field holds comparably long data: give a 1-digit _Difference_ the same box as a manufacturer name and both are wrong. Declaring `meta.cardWidth` switches **that group** to a grid template sized by the **data**, per [ux-testing/header-field-width.html](https://msupply-foundation.github.io/ux-testing/header-field-width.html). The forms:

| Form                   | Track                          | For                                                                                                                                                                     |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ min, max, weight }` | `minmax(<min>rem, <weight>fr)` | every sized field: a tight range (~20%) for a **formatted scalar** (quantity `7.5–9`, currency `10–12`), `12.5–36` at weight 2 for a **lookup** of unpredictable length |
| `{ min, weight }`      | as above, no ceiling           | **free text only** (a note, a comment) — the one content type about which no length claim can be made. Removes its group's own ceiling too                              |
| `7.5` (a number, rem)  | `7.5rem` — fixed               | a scalar pinned to one width. A single figure can absorb no slack, so the row's leftover lands _between_ fields — prefer a tight range                                  |

```ts
{ ...getCellDefinition('numberOfPacks', { cardWidth: { min: 7.5, max: 9, weight: 1 } }) } // scalar: tight range
{ c: { id: 'location' }, meta: { cardWidth: { min: 12.5, max: 36, weight: 2 } } }         // lookup: unpredictable length
{ c: { key: 'note' },    meta: { cardWidth: { min: 12.5, weight: 3 } } }                  // free text: no ceiling
```

**This is [`FormRowItem`](../layout/Form/FormRowItem.tsx)'s model, spelled as column meta.** `weight` / `min` / `max` here are its `weight` / `minWidth` / `maxWidth`, and a card group too narrow for its declared template falls back to the same wrapping weighted flex row that component implements (`flex: <weight> 1 0`, the floor in `min-inline-size` capped at `100%`, the ceiling in `max-inline-size`) — see `CardView`'s `cardFlex`. Keep the two in step: a fix to one is a fix to the other, and the prescriptions header ([`PrescriptionToolbar`](../../sections/prescriptions/detail/PrescriptionToolbar.tsx)) is the worked reference for choosing weights and floors. Its `weight: 0` for a date is the same call as a fixed `rem` track here.

**`fr` is a share of the leftover.** Once every fixed track and every column gap is paid for, what remains is split between the weighted tracks in their declared ratio. So weight expresses **expected data length**, not importance: `"Serum Institute of India Pvt. Ltd."` outweighs `"A1-03"`. Doubling every weight changes nothing — only the ratio counts.

**In the wide grid, `max` is a GROUP ceiling, not a per-field one.** An `fr` share has no maximum of its own, so on a wide card it would keep growing past anything the value can use. The `max` values are summed with the fixed tracks and gaps into a `max-inline-size` on the grid: past that width the row stops growing and the slack becomes trailing space. Capping each field _inside_ its own track was tried first and is wrong — the track kept growing while the field stopped, leaving the remainder as a hole in the MIDDLE of the row (visibly, a gap between Location and Manufacturer). (The wrapping fallback has no fixed tracks, so there `max` **is** per-field.) A group with an uncapped free-text field has no ceiling of its own; every group's ceiling, declared or absent, is additionally held to the **80rem measure** (`MEASURE_WIDE_REM` in CardView, mirroring `--measure-wide`) — a group whose floors sum past the measure wraps on a very wide surface rather than sprawling across it.

**Below the template's own minima it reverts.** An explicit grid doesn't wrap, so `FieldFlow` measures the available width against the sum of the track minima plus gaps and flips to the wrapping weighted flex row above, which keeps each field's declared range and lets only the row count change. The threshold is computed from the group's own declarations — so it follows conditional columns automatically — rather than a breakpoint literal, because a container query's condition can't reference a custom property. A group may instead declare `CardGroup.narrowLayout: { columns }` (with per-field `meta.cardSpan`) to take **equal tracks** in the narrow state — honoured only below the tablet line (`≤1023px`, `breakpoints.navOverlay − 1`), because a span claims a fraction of the row and a declared width doesn't scale, so the two agree at only one panel width; above the line the wrapping row runs regardless. See `CardGroup.narrowLayout`'s jsdoc for choosing the column count.

**The shell.** A width-declaring group renders inside a `container-type: inline-size` wrapper. That isn't decoration: a grid's track minima count toward its min-content width, so without containment a 75rem template widens the whole DataTable and the table scrolls sideways instead of the fields reflowing. It also gives the observer a width that holds still while the template inside it is swapped. An unsized group keeps exactly the DOM it had before.

Two notes on the reference:

- The site's date range (`10–11.5rem`) floors at `DD/MM/YYYY` plus the calendar icon. Our `DateField`'s empty state shows the all-caps `DD MMM YYYY` placeholder, which is wider than the digits it stands for and clips at 10 — so a **usually-empty** date (the stocktake dates) floors at `11`, its ceiling riding up with it.
- [header-field-width.html](https://msupply-foundation.github.io/ux-testing/header-field-width.html) — the weighted-columns worked example — **rejects letting the row wrap**. That rule protects a fixed-height page header; a card body must wrap, which is what the narrow fallback is for, and the site's § Field Widths itself sizes a wrapping row by these ranges.

**Body labels use the dense scale.** A card body field renders its caption through `LabelledValue size="small"` (0.8125rem — ui-standards § inputs' `.field-label--small`). At the 14px default the caption sat a step _larger_ than a `size="small"` control's 13px text, i.e. above the value it captions. The card's identity row (`headerPosition: 'primary'`, a `FieldRow`) deliberately keeps the full-size label — it reads as the card's heading.

Distinct from the top-level `size` / `maxSize`, which are TanStack's drag-resizable **table** column widths.

## Table-level API

Passed to `<DataTable>`.

| Prop                   | Type                                                         | Effect                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cardGroups`           | `CardGroup<T, G>[]`                                          | Declares each **body group's** presentation (below). Card-view only; table view ignores it.                                                                                                  |
| `showCardToggle`       | `boolean`                                                    | Show the card⇄table toggle in the toolbar (above the 600px compact band). Needs `setConfig`. Omit for a table with no card view, or a card-only screen.                                      |
| `config` / `setConfig` | table config                                                 | `config.viewMode` picks the view above the compact band (`'table'` default). Seed base-band `viewMode: 'card'` to default to cards. **Below 600px the table is always card**, toggle hidden. |
| `enableSelection`      | `boolean`                                                    | Adds the leading selection checkbox to both views.                                                                                                                                           |
| `onRowClick`           | `(row) => void`                                              | Click-through on a row/card. Disclosure and inline-editing controls stop propagation so they don't trigger it.                                                                               |
| `rowState`             | `(row) => 'verified' \| 'warning' \| 'disabled'`             | The row's **background** tint, mapped from the row's own facts — see [Row states & backgrounds](#row-states--backgrounds). **Table view only.**                                              |
| `rowTone`              | `(row) => 'info' \| 'warning' \| 'error'`                    | The row's **text** colour (info / warning / error) — same section. Table view paints the whole row's text; card view the card's **identity title** only.                                     |
| `cardTone`             | `(row) => 'info' \| 'warning' \| 'error'`                    | CARD-ONLY tone override: cards take their tone from this when set, leaving table text unpainted (`rowTone` unset) — for status-tinted tables (spec D111).                                    |
| `rowTint`              | `(row) => 'unfinished' \| 'success' \| 'warning' \| 'error'` | The row's record-STATUS **background**, always on (unlike `rowState`'s selection-gated tints) — see [rowTint](#rowtint--the-status-background). **Table view only.**                         |
| `rowAccent`            | `(row) => 'unfinished' \| 'success' \| 'warning' \| 'error'` | A bar down the row's **leading edge** — see [rowAccent](#rowaccent--the-leading-edge-bar). Normally the same predicate as `rowTint`. **Table view only.**                                    |

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

The card label text is the column's `header`, called (it is a function so the text re-resolves on a locale change). Whether and how it renders:

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

### `rowTint` — the status background

`rowTint={(row) => 'unfinished' | 'success' | 'warning' | 'error' | undefined}` is the record-STATUS background channel, **always on** — unlike `rowState`'s selection-gated tints: `success` (green) for a satisfied row (an outbound line with stock allocated), `error` (red) for an error-state row (expired stock), `warning` (amber) for a row needing attention (a held batch). One tint per row; the page encodes its own precedence (outbound: allocated > expired > held — spec D111). Table view only — cards carry status via `cardTone` + badges. It shows through the `disabled` grey (the status is why the row is disabled; the muted text stays), and selection deepens the tint instead of switching to the selection blue. On **clickable** rows (`onRowClick` set — the detail tables) hover deepens the tint further; non-clickable grids (the line editors) have no hover response. Never colour alone: the tint restates a fact a cell states in words. A prop function reading a store field (the outbound editor's `numberOfPacks`) re-evaluates on in-place edits — the tint flips live, with none of the TanStack accessor-caching trouble.

### `rowAccent` — the leading-edge bar

`rowAccent={(row) => 'unfinished' | 'success' | 'warning' | 'error' | undefined}` draws a solid 3px bar down the row's **inline-start edge**, in the same tone vocabulary as `rowTint`. **`'unfinished'`** is the tone for a row still awaiting a step the user must take — its own hue (`--marking-unfinished`), not the caution amber, because such a row is unfinished rather than wrong; see the token in `tokens.css` for why none of the severities would do. It answers a different question from the tint: the tint says what a row _is_, the bar makes a set of rows countable — with the accented rows aligned on one edge, "how much is left?" is answered by running the eye down that edge instead of reading every row (the outbound detail table's unissued lines). Pass it the **same predicate as `rowTint`**, so the whole row and its edge say one thing; a page using the bar alone is fine too, but the two are not independent channels to spend on different facts.

Table view only (cards carry status via `cardTone` + badges). It's drawn as an overlay on the row's leading cell — the selection cell where the table has one, else the first data cell — so an accented row is exactly as wide as an unaccented one and nothing shifts sideways when a row flips state mid-edit. Logical inset, so it follows the reading direction in RTL. Never colour alone: as with the tint, a cell or badge in the row states the same fact in words.

### `rowTone` — the text colour

`rowTone={(row) => 'info' | 'warning' | 'error' | undefined}` is the orthogonal **text-colour** channel (not a background): `info` paints the row's text in the action-blue tone (a record awaiting an action — a placeholder / uncounted line), `warning` in the warning tone (a record needing attention before it can proceed — an outbound line issued from a held batch, spec D111), `error` in the error tone (a line the server refused). It composes on top of any `rowState` background. In table view the tone paints the whole row's text (surviving the disabled muting); in card view it paints the card's **identity title** only — a whole-card repaint would recolour field labels and controls. Never colour alone: a tone restates a fact some cell already states in words.

A page whose table rows must stay plain-text (a status-tinted table — spec D111) sets **`cardTone`** instead of `rowTone`: cards take the tone treatment from it, table text stays unpainted. When both are set, cards prefer `cardTone`.

### Flag cells in the badge slot

A `getFlagCell` check is anonymous by design in table view — its column header names it. In a card's **badge** slot there is no header, so the cell renders **two representations, one shown per view** (CSS-gated in DataTable.module.css): the bare check (`[data-flag]`) in table view, and a **`StatusBadge` chip** (`[data-flag-chip]`) on the card — label + optional icon in the flag's semantic `tone` (`getFlagCell(label, meta, tone, icon)`), including `'success'` for affirmative flags like the auto-allocation tick. A bespoke flag cell opts in by rendering the same pair. Status-flag chips sit directly **after the card title** (the identity stops absorbing the space when the badges are flags); action-bearing badge slots keep the corner. Body-slot card flags need none of this — they get a check with a `LabelledValue` caption like any body field.

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

### 4. A cards-by-default screen (table available, not the default)

A line-edit modal or similar whose natural presentation is cards: seed `viewMode: 'card'` in the base band and lean on `panel` + `disclosure` groups — then pass `showCardToggle` so anyone who prefers the dense table can flip to it above the compact band, `setConfig` persisting the choice per user (#886). (See the inbound / outbound / stocktake line-edit modals and [LineEditModal.tsx](../../ui-showcase/LineEditModal.tsx).)

Omit `showCardToggle` only where the column set genuinely has no usable table face — that makes the screen card-**only**, and the user has no way back.

```ts
type GroupKey = 'batch' | 'pricing';
const CARD_GROUPS: CardGroup<Draft, GroupKey>[] = [
  // The primary panel is UNLABELLED — the card's own header field already names
  // the row ("Batch"), so a caption above it would be the same word twice.
  { key: 'batch', panel: true },
  {
    key: 'pricing',
    labelKey: 'label.pricing-additional-info',
    panel: true,
    disclosure: 'closed',
  },
];
```

### Withdrawing a field per row

`hideOnCard` is all-or-nothing per column. `meta.hideOnCardWhen: (row) => boolean` is the per-**row** version, for a field that is meaningless for some records rather than for the whole table — the stocktake line editor's Reason, which applies only to a batch counted to something other than its snapshot.

```ts
{
  c: { id: 'inventoryAdjustmentReasonInput' },
  header: () => t('label.reason'),
  cardGroup: 'batch',
  meta: {
    cardWidth: { min: 12.5, max: 36, weight: 2 },
    hideOnCardWhen: line => !line.countThisLine || adjustmentDirection(line) === null,
  },
  cell: /* … disabled when there is no direction — that governs TABLE view */
}
```

**Returning `null` from the cell is not the same thing.** The card wraps every body cell in its caption, so a nulled cell leaves a label standing over blank space — the field looks broken rather than absent. `hideOnCardWhen` is applied where `hideOnCard` is, at the single cell list every later split reads, so the field leaves its group, takes its caption with it, and is excluded from the group's width template and narrow-fallback threshold. The neighbours close up instead of leaving a hole.

**Card view only, deliberately.** A table column is a property of the grid, not the row: blanking one row's cell keeps the columns aligned, removing it would not. Give the cell renderer whatever blank/disabled treatment the table face needs.

Reach for it only for genuinely per-row conditions. A whole-column condition — a store preference, or an item attribute on a one-item editor — should build the column conditionally instead, so it never enters the column list at all.

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
