import type { JSX } from 'solid-js';
import type {
  ColumnDef,
  HeaderContext,
  IdentifiedColumnDef,
  RowData,
} from '@tanstack/solid-table';
import type { LocaleKey } from '../../../intl';

// The DataTable's COLUMN MODEL — pure types + pure functions, no reactivity or
// JSX. Split out of DataTable.tsx so a page (or tableHelpers) can import a
// `Column` type without pulling in the 60KB component module, and so the column
// shape lives in one place. DataTable.tsx re-exports these so existing
// consumers keep importing from './DataTable'.

// An untyped display convention → TanStack's `meta` bag (kdd/table-state: meta
// for flags that need no table-specific type). Augmented here so it's typed
// everywhere columnDef.meta is read (the cell helpers in tableHelpers.ts set
// align; the renderers read it). A convention that needs the K generic goes on
// Column<T,K> instead.
declare module '@tanstack/solid-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Text alignment for the cell + header — a display-only convention
     * TanStack has no
     *  concept of; read by the renderers and applied via a data-align
     *  attribute.
     */
    align?: 'left' | 'right' | 'center';
    /**
     * Max number of lines this column's body cells may wrap to before
     * truncating with an
     *  ellipsis (default is single-line nowrap). e.g. 2 = up to two lines then
     *  clamp. A display convention; applied via a --wrap-lines custom property
     *  on the cell.
     */
    wrapLines?: number;
    /**
     * Render this column's VALUE cells in the monospace font (--font-mono) —
     * for code-like fields (item code, batch, location code) where fixed-width
     * digits/letters read better and align. A display-only convention (like
     * align): applied via a data-mono attribute on the body cell (table) and
     * the card field (card), NOT the header label. Set by the `code` cell kind
     * by default (getCellDefinition('itemCode' | 'batch' | 'code' | 'location'
     * | …)); overridable per column via the meta merge.
     */
    mono?: boolean;
    /**
     * Where this column's cell renders in the CARD HEADER (card view). The
     * header is the card's top row: a big identity/title inline-start and a
     * badge/chip inline-end, both rendered WITHOUT their label. A column has a
     * single `cell` renderer, so a value that must appear as a header title AND
     * as an editable body field rendered differently is TWO column defs, each
     * naming its own placement. Two slots:
     *  • 'primary' — the identity/title, inline-start (no label).
     *  • 'badge'   — the chip, inline-end (no label).
     * A column with NO headerPosition falls into the card BODY, placed by its
     * `cardGroup` (Column.cardGroup — grouped, optionally panelled, optionally
     * inside a disclosure; see CardGroup + CardView). Visibility still follows
     * columnVisibility — a hidden column doesn't appear on the card either.
     */
    headerPosition?: 'primary' | 'badge';
    /**
     * Override whether this column's field label shows in CARD view. The
     * default follows the slot: HEADER cells (headerPosition) render WITHOUT a
     * label, BODY cells WITH one. Set explicitly to override either case — e.g.
     * `showLabel: true` on a primary header field to caption it ("Batch"), or
     * `showLabel: false` on a body field to drop its label. The label text is
     * the column's `header`, CALLED (our headers are function-only so their
     * text re-resolves on a locale change — CardView.columnHeaderText does the
     * calling). A column with no header at all yields no label, and the cell
     * fills its slot unlabelled.
     */
    showLabel?: boolean;
    /**
     * Omit this column from TABLE view (a card-only column). Independent of
     * headerPosition/cardGroup, which still place it on the card.
     */
    hideOnTable?: boolean;
    /**
     * Omit this column from CARD view (a table-only column). When true,
     * headerPosition/cardGroup are moot; setting both hide flags renders the
     * column nowhere.
     */
    hideOnCard?: boolean;
    /**
     * Omit this field from the cards of the ROWS this predicate answers true
     * for — the per-row counterpart of `hideOnCard`, which is all-or-nothing
     * per column.
     *
     * For a field that is meaningless for SOME records rather than for the
     * whole table: the stocktake line editor's Reason, which applies only to a
     * batch whose count differs from its snapshot. Returning null from such a
     * cell is NOT the same thing — the card still renders the field's caption
     * around the empty cell, so the row shows a label over blank space. This
     * withdraws the whole field, caption included, and its neighbours close up.
     *
     * CARD VIEW ONLY, deliberately. A table column is a property of the column,
     * not the row: blanking one row's cell keeps the grid aligned, whereas
     * removing it would not. So a table row simply renders the cell as usual —
     * use the cell's own renderer to blank it there if that is wanted.
     *
     * Whole-column conditions stay where they belong: build the column
     * conditionally (a store preference, a non-vaccine item) rather than
     * declaring it and hiding it on every row.
     *
     * Declared METHOD-style, not as a property holding an arrow type: the
     * helpers in tableHelpers build their metas against the row-erased
     * `ColumnMeta<never, unknown>`, and a property-style parameter is
     * contravariant under strictFunctionTypes, so `(row: never) => boolean`
     * would not assign to `(row: T) => boolean`. A method parameter is
     * bivariant, which is what lets one erased meta serve every row type.
     */
    hideOnCardWhen?(row: TData): boolean;
    /**
     * An explanation of what this column's figure means, as ALREADY-TRANSLATED
     * text — the header's tooltip content (spec/internal-orders § S3 lists the
     * `description.*` key per column; a plugin column carries its own key,
     * resolved in the plugin's namespace). Threaded here so the header tooltip
     * is declared once per column, wherever the column came from. ⚠️ The
     * header-cell tooltip render is a host follow-up; setting this today is how
     * a column declares the text, not yet how it shows.
     */
    description?: string;
    /**
     * Omit this column from the Columns settings popover — it stays in the
     * view, it's just not user-configurable (no show/hide/move/pin row). For
     * structural columns the user shouldn't touch, e.g. a card's identity
     * (headerPosition 'primary') or its row-actions column.
     */
    hideFromColumnSettings?: boolean;
    /**
     * This field's width in CARD view. Card view otherwise lays a group's
     * fields out as EQUAL auto-fit tracks, which gives a 1-digit Difference the
     * same box as a manufacturer name — `repeat(N, 1fr)` is only right when
     * every field holds comparably long data. Two forms, per
     * ux-testing/header-field-width.html § "a field's column is sized by its
     * data, never by its count":
     *
     *  • **a number (rem)** — a FIXED track, for a formatted scalar whose
     *    longest value is known: a numeric quantity (7.5), a currency (10), a
     *    date (8.5 — the measured intrinsic width of a formatted date; a sixth
     *    of a strip is pure waste on one).
     *  • **`{ min, max, weight }` (rem, rem, ratio)** — a WEIGHTED track, for
     *    free text and name/lookup fields whose length is unpredictable. The
     *    row's leftover width is shared between these in `weight` proportion,
     *    from a `min` floor up to a `max` ceiling. Weight expresses expected
     *    data length: a manufacturer ("Serum Institute of India Pvt. Ltd.")
     *    outweighs a location code ("A1-03").
     *
     * `max` is what stops the last field on a wrapped line
     * from stretching across the whole of it — the failure the weighted model
     * replaced. Past its ceiling a field simply stops growing and the row ends
     * in space, which is the honest result of sizing by data. **Omit it only
     * for FREE TEXT** (a note, a comment): every ceiling here is a claim about
     * how long the value will be, and free text is the one kind about which no
     * such claim can be made. An uncapped field also removes its GROUP's
     * ceiling, since a row that can grow without limit has no meaningful one.
     *
     * Opt-in per GROUP: a group where NO column declares one keeps the equal
     * tracks; in a group where at least one does, an undeclared column falls
     * back to a `1fr`-ish sink. Fields still wrap intrinsically when the card
     * narrows (CLAUDE.md #7) — a card body must wrap, so the reference doc's
     * "rejected: let the row wrap" (which is protecting a fixed-height header
     * strip) doesn't carry over; only its sizing model does.
     *
     * Distinct from the top-level `size`/`maxSize`, which are TanStack's TABLE
     * column widths (px, drag-resizable) — card fields aren't table columns and
     * aren't resizable, so they carry their own figure.
     */
    cardWidth?: number | { min: number; max?: number; weight: number };
    /**
     * Tracks this field occupies of its group's `narrowLayout.columns` —
     * ignored in any other layout. Those tracks are deliberately too fine for a
     * field to sit in one, so in such a group EVERY field declares a span; that
     * is what lets the spans express a real ratio between fields rather than the
     * 1-against-2 an even one-field-per-column grid is limited to.
     *
     * Pick the span from the data, then check the rows come out even — a span
     * that leaves a row part-empty is the layout's one failure mode. The inbound
     * batch panel is the worked example: 2 for every formatted scalar, 3 for the
     * two long lookups, which tiles exactly at 8 fields, at the 5 a non-store
     * supplier shows, and again with the 3 vaccine/auth fields added.
     */
    cardSpan?: number;
    /**
     * The column's name IN WORDS, for a column whose grid header deliberately
     * renders EMPTY or ICONIC (the line editor's auto-allocation tick — blank
     * header in the grid; the comment column — a glyph). Used everywhere the
     * icon can't stand in for the column: the Columns settings popover's row
     * label, and a card field's caption. A function, like `header`, so the text
     * re-resolves on a locale change. Columns with a text header don't set this
     * — both surfaces call `header`.
     */
    textLabel?: () => string;
  }
}

export type SortState<K extends string> = { key: K; desc: boolean };

// How a column identifies itself — a discriminated union of the three real
// scenarios, replacing TanStack's raw accessorKey/accessorFn/id fields (which
// we strip from the base below, so identity is spelled EXACTLY one way per
// column and can be typed): • `key`      — a strict `keyof T`: the column reads
// that field, is natively sortable, and its id is that key. Typos are a compile
// error. The common case. • `id`       — a display column with no data accessor
// (an actions column, a checkbox): just a unique id, no value read. •
// `accessor` — a computed value (a nested `row.item.code`, a derived string):
// an accessorFn plus an explicit `id`, since there's no key to derive one from.
// The mapper `toColumnDef` (below) turns each case into the matching TanStack
// fields, and always sets an explicit `id` — so EVERY column has a known id (no
// accessorKey-derivation to mirror), which the sort-key ⇄ id round-trip and
// column config rely on. This lives under the column's `c` field (below) as ONE
// nested object, so it can't get mixed up with the display fields
// (header/cell/meta) or `sortKey`.
export type ColumnIdentity<T> =
  | { key: keyof T; id?: never; accessor?: never }
  | { id: string; key?: never; accessor?: never }
  | { accessor: (row: T) => unknown; id: string; key?: never };

// Our column = a `c` field holding the identity union (nested so it never
// mixes with the rest) + the non-identity TanStack column fields (cell, header,
// meta, enableSorting, …) via IdentifiedColumnDef minus its own `id` — that
// interface is exactly ColumnDefBase (cell/meta/footer/sorting/…) PLUS
// `header`, and carries NONE of accessorKey/accessorFn (those live in
// TanStack's identity mixins, which we're replacing); we drop its optional `id`
// since our identity `c` owns id — then add our two extensions: • `sortKey` —
// the GraphQL sort field, typed as a real K (kept SEPARATE from identity: a
// column may sort by a different field than it displays, and ColumnMeta can't
// carry K since ColumnDef only parameterises over TData/TValue). Usually equals
// the column's key/id; the DataTable maps sortKey ⇄ resolved id for the
// manual-sort round-trip. • `cardGroup` — the card BODY group this column's
// field belongs to in card view (typed G, so a typo is a compile error). One
// group per column; omit and the field falls into the card's default
// (unpanelled, always-shown) group. The group's presentation — icon, panel,
// disclosure — is declared once in the table's `cardGroups` list (see
// CardGroup + CardView). Header columns (meta.headerPosition) ignore cardGroup.
// Display-only conventions (align, header slot) live in `meta` —
// kdd/table-state.
//
// `header` is narrowed to FUNCTION-ONLY here (TanStack itself also allows a
// bare string). A bare string bakes the CURRENT locale's translated text into
// the column at whatever moment the column array was built, with nothing left
// to react when the locale later changes — the only way to refresh it is to
// rebuild the entire columns array (and thus reallocate every column/cell
// closure) from scratch, which is what pulled `t()` into columns' dependency
// list and made it churn on every locale change. A function is called by
// TanStack's `flexRender` on every header render (HeaderCell.tsx), same as
// `cell`/`footer` already work — so `header: () => t('label.code')` reacts to
// locale changes at the header-cell level, same fine-grained reactivity as any
// other Solid read, and never needs to appear in a `columns` memo's dependency
// list at all.
export type Column<T, K extends string, G extends string = never> = {
  /**
   * The column's identity — one of key / id / accessor+id (see
   * ColumnIdentity). Nested under
   *  its own field so the identity choice stays distinct from the display
   *  fields and sortKey.
   */
  c: ColumnIdentity<T>;
} & Omit<IdentifiedColumnDef<T>, 'id' | 'minSize' | 'header'> & {
    header: (context: HeaderContext<T, unknown>) => JSX.Element;
    sortKey?: K;
    cardGroup?: G;
  };
// `minSize` is deliberately OMITTED (not just unused): it's TanStack's drag
// lower-bound, NOT the resting min-width (that comes from `size`, delivered as
// the min-width floor). A dev setting `minSize` expecting a wider column would
// see nothing at rest — a footgun — so passing it is a compile error, steering
// them to `size`. TanStack keeps its internal default (20) as the drag floor,
// which is what we want (a `size` default is a SOFT default — freely draggable
// smaller). Width caps use `maxSize` (delivered as max-width). See
// docs/CELL_TYPES.md.

// Map our Column → the TanStack ColumnDef it feeds to createSolidTable,
// translating the `c` identity into the matching TanStack fields and
// GUARANTEEING an explicit `id`: • key      → accessorKey: key, id: String(key)
// • accessor → accessorFn: accessor, id • id       → id (a display column — no
// accessor) The rest of the column (header/cell/meta + our sortKey/cardGroup)
// rides along untouched — read back off the columnDef by the sort mapper,
// CardView's group engine, and ColumnSettings.
export const toColumnDef = <T, K extends string, G extends string>(
  col: Column<T, K, G>
): ColumnDef<T> => {
  const { c, ...rest } = col;
  // Sortability follows `sortKey`: a column is sortable only when it declares
  // one (its server sort field). Without this, TanStack's getCanSort() defaults
  // to true for every accessor column, so a non-sortable header (e.g. Mobile /
  // Gender) would wrongly show the pointer cursor + reserved sort indicator and
  // take a dead click that maps to no sortKey (onSort never fires). An explicit
  // enableSorting on the column still wins.
  // `rest` already carries TanStack's own fields — including
  // `aggregationFn`/`aggregatedCell` for row grouping (from ColumnDefBase) — so
  // a caller sets those directly; nothing else to remap.
  const enableSorting = rest.enableSorting ?? rest.sortKey !== undefined;
  if (c.key !== undefined)
    return {
      ...rest,
      enableSorting,
      accessorKey: c.key,
      id: String(c.key),
    } as ColumnDef<T>;
  if (c.accessor !== undefined)
    return {
      ...rest,
      enableSorting,
      accessorFn: c.accessor,
      id: c.id,
    } as ColumnDef<T>;
  return { ...rest, enableSorting, id: c.id } as ColumnDef<T>;
};

// A card BODY group — how one `cardGroup` key presents in card view. The table
// declares a const list (`DataTable.cardGroups`); each column's `cardGroup`
// references a key (typed G). A group renders as a captioned block of its
// columns' fields, in the order the groups are listed; the default (ungrouped)
// group renders first, unpanelled, always shown. Every field of the group
// beyond the header is a label + value.
export type CardGroup<T, G extends string> = {
  /** The group key — what a column's `cardGroup` must match. */
  key: G;
  /**
   * i18n key for the group caption / disclosure header. OPTIONAL — the common
   * primary group is unlabelled (just its fields). A disclosure group with no
   * label falls back to "More details".
   */
  labelKey?: LocaleKey;
  /**
   * Optional leading icon for the group — as a FACTORY (`() => <Icon/>`), not a
   * bare element. The icon renders once per card (one node per row); a shared
   * JSX element is a single DOM node that can only live in one place (it would
   * end up on just the last card), so each render site calls this for its own
   * node.
   */
  icon?: () => JSX.Element;
  /**
   * Render this group's fields inside a contained panel (the mockup's tinted
   * "zone") rather than flat on the card. Default false — good for the wide
   * modal cards, off for small list cards.
   */
  panel?: boolean;
  /**
   * Put this group inside a disclosure (Accordion). Omit → always shown, no
   * accordion (the "primary" content). 'open' → accordion, initially open.
   * 'closed' → accordion, initially collapsed (the "secondary" content). A
   * table-only field is `meta.hideOnCard`, not a disclosure state.
   */
  disclosure?: 'open' | 'closed';
  /**
   * Row-specific preview shown beside the disclosure header WHILE COLLAPSED
   * (e.g. "Diff +3 · Reason: Damaged"). Only meaningful with `disclosure`.
   */
  disclosurePreview?: (row: T) => JSX.Element;
  /**
   * How this group lays out once the card is too narrow for its declared
   * `cardWidth` template. Omit for the default: a wrapping weighted flex row
   * that keeps each field's declared size (see CardView's `cardFlex`). Fields
   * are then sized to their data, but a wrapped line's edges don't line up with
   * the line above — flex lines are independent.
   *
   * `{ columns: N }` instead lays the fields on N equal tracks, each field taking
   * the number it declares in `meta.cardSpan`. Every row then fills its width and
   * every row shares the same column edges, at the price of a field's width being
   * a multiple of a track rather than exactly what its data asks for.
   *
   * **N is a consequence of the group's own fields, not a house number.** Work it
   * out, don't guess: the finest track has to be coarse enough that the widest
   * field which MUST fit (usually a date, ~11rem for `DD MMM YYYY` plus its
   * trigger) can be reached by a whole number of tracks, and N has to divide into
   * each row's intended field grouping. Two worked examples, both on a ~41rem
   * panel:
   *
   *   - The inbound batch panel takes **6**: eight fields as three rows of
   *     three, spans 2/2/2 per row and 3+3 for the two long lookups.
   *   - The stocktake batch panel takes **10**: six fields as a row of FOUR then
   *     a row of two, which 6 cannot express (a date needs 2 of 6 = 13rem, and
   *     three of those plus a fourth field overflows). At 10, spans 2/2/2/4 fill
   *     row one and 6+4 fill row two, which is what lets Location have 24rem
   *     instead of the 13rem an even three-per-row would allow it.
   *
   * If no N tiles the group, that's a real answer: leave `narrowLayout` unset and
   * take the weighted flex default, which sizes exactly but doesn't align.
   *
   * Choose this when the tidiness is worth more than exact sizing.
   */
  narrowLayout?: { columns: number };
};
