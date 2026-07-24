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
     * Where this column's cell renders in CARD view (viewMode 'card'). Exactly
     * ONE position per column def: a column has a single `cell` renderer, so a
     * value that must appear in two places rendered differently (e.g. Batch as
     * a header title AND as an editable input in the body) is TWO column defs,
     * each naming its own position — not one column in two positions. The four
     * positions split into a header row and a content body:
     *  • 'header-primary'    — the big top-left identity/title (no label).
     *  • 'header-badge'      — the top-right chip (no label).
     *  • 'content-primary'   — a body field, always shown (labelled).
     *  • 'content-secondary' — a body field, hidden in compact card views
     *                          (labelled).
     * Header positions are never labelled; content positions are captioned with
     * the column's own `header`. A column with NO cardPosition falls into the
     * body alongside the content positions (the ungrouped/secondary flow — see
     * CardView), grouped into rows by `tabsAndCardGroups` when the table is
     * grouped. Visibility still follows columnVisibility — a hidden column
     * doesn't appear on the card either.
     */
    cardPosition?:
      | 'header-primary'
      | 'header-badge'
      | 'content-primary'
      | 'content-secondary';
    /**
     * Omit this column from TABLE view (a card-only column). Independent of
     * cardPosition, which still places it on the card.
     */
    hideOnTable?: boolean;
    /**
     * Omit this column from CARD view (a table-only column). When true,
     * cardPosition is moot; setting both hide flags renders the column nowhere.
     */
    hideOnCard?: boolean;
  }
}

export type SortState<K extends string> = { key: K; desc: boolean };

// A column that belongs to EVERY tab but is not itself part of card grouping
// (a row-identity anchor like the batch or the selection). Setting
// `tabsAndCardGroups: ALL_TABS` (the bare const, not an array) is explicit:
// shows in every tab (table view), and in card view falls to the ungrouped area
// (if it has no `card` region) rather than any card group's row.
export const ALL_TABS = '__all_tabs__';

// A column's tab / card-group membership as stored on the columnDef: either
// the ALL_TABS sentinel, an array of card-group keys, or absent.
export type Membership = string[] | typeof ALL_TABS | undefined;

// Does a membership put the column in a given tab? ALL_TABS → yes for any tab;
// an array → yes if it lists that card group (each card group is one tab);
// absent → no.
export const membershipInTab = (m: Membership, tab: string): boolean =>
  m === ALL_TABS ? true : Array.isArray(m) ? m.includes(tab) : false;

// The real card-group keys a membership names (excludes ALL_TABS / absent).
export const membershipCardGroups = (m: Membership): string[] =>
  Array.isArray(m) ? m : [];

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
// manual-sort round-trip. • `tabsAndCardGroups` — the card-group membership (a
// card group is presented as a TAB in table view, hence the name): EITHER the
// ALL_TABS sentinel (bare — an anchor in every tab but not a card group), OR an
// ARRAY of the table's card-group keys (typed G, so a typo is a compile error;
// a column may list several). Omitting it means the column is in no card group
// — in card view it lands in the ungrouped area. See TabAndCardGroup + the
// filter in DataTable, and kdd/edit-line-card-table. Display-only conventions
// (align, card region) live in `meta` — kdd/table-state.
export type Column<T, K extends string, G extends string = never> = {
  /**
   * The column's identity — one of key / id / accessor+id (see
   * ColumnIdentity). Nested under
   *  its own field so the identity choice stays distinct from the display
   *  fields and sortKey.
   */
  c: ColumnIdentity<T>;
} & Omit<IdentifiedColumnDef<T>, 'id'> & {
    sortKey?: K;
    tabsAndCardGroups?: G[] | typeof ALL_TABS;
  };

// Map our Column → the TanStack ColumnDef it feeds to createSolidTable,
// translating the `c` identity into the matching TanStack fields and
// GUARANTEEING an explicit `id`: • key      → accessorKey: key, id: String(key)
// • accessor → accessorFn: accessor, id • id       → id (a display column — no
// accessor) The rest of the column (header/cell/meta + our
// sortKey/tabsAndCardGroups) rides along untouched — read back off the
// columnDef by the sort mapper, the card-group filter, and ColumnSettings.
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

// A card-group definition for a grouped table. The page declares a const list;
// `Column.tabsAndCardGroups` references these keys (typed as G). One shape
// drives both faces (kdd/edit-line-card-table): a card group shows as a TAB in
// table view and a GROUP-ROW in card view — hence the icon (shown on the tab +
// card group row) and the translated label.
export type TabAndCardGroup<G extends string> = {
  /**
   * The card-group key — what a column's `tabsAndCardGroups` entry must match.
   */
  key: G;
  /** i18n key for the card-group label (shown on its tab + card group row). */
  labelKey: LocaleKey;
  /**
   * Optional icon for the card group — its tab and its card group-row — as a
   * FACTORY (`() => <Icon/>`), not a bare element. The icon renders in
   * multiple places at once (the tab strip + one per card in card view); a
   * shared JSX element is a single DOM node that can only live in one place
   * (it would end up on just the last card), so each render site calls this to
   * get its own node.
   */
  icon?: () => JSX.Element;
};
