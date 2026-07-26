import type { JSX } from 'solid-js';
import type {
  ColumnDef,
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
     * the column's string `header` (a JSX/function header yields no label).
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
     * Omit this column from the Columns settings popover — it stays in the
     * view, it's just not user-configurable (no show/hide/move/pin row). For
     * structural columns the user shouldn't touch, e.g. a card's identity
     * (headerPosition 'primary') or its row-actions column.
     */
    hideFromColumnSettings?: boolean;
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
export type Column<T, K extends string, G extends string = never> = {
  /**
   * The column's identity — one of key / id / accessor+id (see
   * ColumnIdentity). Nested under
   *  its own field so the identity choice stays distinct from the display
   *  fields and sortKey.
   */
  c: ColumnIdentity<T>;
} & Omit<IdentifiedColumnDef<T>, 'id' | 'minSize'> & {
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
  // `rest` already carries TanStack's own fields — including
  // `aggregationFn`/`aggregatedCell` for row grouping (from ColumnDefBase) — so
  // a caller sets those directly; nothing to remap.
  if (c.key !== undefined)
    return { ...rest, accessorKey: c.key, id: String(c.key) } as ColumnDef<T>;
  if (c.accessor !== undefined)
    return { ...rest, accessorFn: c.accessor, id: c.id } as ColumnDef<T>;
  return { ...rest, id: c.id } as ColumnDef<T>;
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
};
