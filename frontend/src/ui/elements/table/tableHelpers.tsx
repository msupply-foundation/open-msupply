import type { JSX } from 'solid-js';
import type { ColumnDefBase, ColumnMeta } from '@tanstack/solid-table';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { formatCurrency } from '../../../intl/currency';
import { Comment } from '../feedback/Comment';
import { StatusBadge } from '../feedback/StatusBadge';
import { CheckIcon, MessageSquareIcon } from '../../icons';
import { t } from '../../../intl';
import type { Column } from './columnTypes';
import { getChipListCell } from './ChipListCell';
import { getProportionCell } from './ProportionCell';
import {
  CELL_DEF,
  KIND_WIDTH,
  type CellDefinitionKey,
  type CellKind,
  type CellSpec,
} from './_globalColumnConfig';
import { remToPx } from '../../utils/rem';
import {
  differenceInCalendarDays,
  differenceInMonths,
  parseISO,
} from 'date-fns';
import styles from './tableHelpers.module.css';

// Shared helpers for the DataTable: cell fragments pages spread into their
// column defs, and the sortKey ⇄ column-id mapping. Kept in one place so a page
// has a single table-helper import.

// =================================================================================
// Cell fragments — spread into a Column literal (see StocktakesList). The
// column's identity `c` (usually `{ key }`) supplies the value; these only add
// what differs from a plain text column — alignment (via meta) or a `cell` that
// formats the value TanStack already resolved (info.getValue()). A plain text
// column needs no helper: `{ c: { key }, header, sortKey }` renders it as-is.
// Each takes an optional `meta` the caller can override/extend (e.g. re-align a
// number column); it's spread over defaults.
// =================================================================================

// TanStack's meta is invariant over TData; helpers are generic and don't fix a
// row type, so use the loosest row type for the meta param and let the spread
// widen.
type Meta = ColumnMeta<never, unknown>;

// The cell-type widths + key→kind mappings live in _globalColumnConfig.ts (the
// one place devs tune column widths); imported above. This file owns the
// rem→px conversion + the getCellDefinition lookup that assembles them.

// Build the TanStack size/maxSize (px) fields from rem widths.
const sizing = (
  sizeRem: number,
  maxRem?: number
): { size: number; maxSize?: number } => ({
  size: remToPx(sizeRem),
  ...(maxRem !== undefined ? { maxSize: remToPx(maxRem) } : {}),
});

// Empty cells render BLANK (ui-standards § tables; Carl 2026-07-23): a dash
// reads as data. A real zero is a VALUE and still renders "0"; reserve a
// literal "N/A" for a field genuinely not applicable to the row (≠ missing),
// rendered by the page's own cell. (The items list's months-of-stock dash is
// spec-owned — AC-S2, absence ≠ zero — and deliberately kept.)

// These return a narrow column FRAGMENT — only the fields they set (meta/cell
// + the grouping aggregationFn), typed off ColumnDefBase (the non-identity
// shared column fields), NOT our Column<T,K,G>. Excluding the identity union +
// sortKey/groups extension lets a fragment spread into a Column of ANY (K, G) —
// including a groups-only edit table whose K is `never` — without a `sortKey?:
// never` or identity clash. `cell` matches ColumnDefBase's own signature
// exactly. Exported for the cell COMPONENTS that build a fragment of their own
// too — ChipListCell (getChipListCell), ProportionCell (getProportionCell).
//
// aggregationFn sets the DEFAULT grouped-parent value (row grouping — see
// DataTable rowGroup): a number column sums its leaves; a date column shows the
// shared date or [multiple]. The stocktake detail table no longer groups, but
// the shared DataTable still supports grouping (card view, other verticals), so
// the fragment keeps carrying the grouping fields.
// size/maxSize (px) ride along too, so getCellDefinition can bake the cell
// type's default width into the same fragment (they're TanStack's own top-level
// column props — see columnTypes.ts; minSize is deliberately not offered).
export type CellFragment<T> = Pick<
  ColumnDefBase<T>,
  'meta' | 'cell' | 'aggregationFn' | 'aggregatedCell'
> & { size?: number; maxSize?: number };

// Format a date value the ONE way: no value → blank, else localised.
const formatDateCell = (value: string | Date | null | undefined): string =>
  value ? localisedDate(value) : '';

// Plain text: left-aligned (the default), no cell fn — TanStack renders the
// value as-is. Opt into wrapping via meta.wrapLines. Width (text vs short-text
// vs code) is applied by getCellDefinition, not here.
export const getTextCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
});

// Numbers: right-aligned, displayed locale-formatted to at most 2 dp
// (ui-standards § tables; the old app's number-cell default) — derived values
// carry float dust and raw renders skip digit grouping. Display-only: the
// underlying value is untouched. Non-number values (a pre-formatted string)
// pass through; absent renders blank.
export const getNumberCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
  cell: info => {
    const value = info.getValue<number | string | null | undefined>();
    return typeof value === 'number'
      ? formatNumber(value, { maximumFractionDigits: 2 })
      : (value ?? '');
  },
});

// Percentage — a Number variant: right-aligned, value + '%' (blank when null).
export const getPercentageCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
  cell: info => {
    const value = info.getValue<number | null | undefined>();
    return value == null ? '' : `${formatNumber(value)}%`;
  },
});

// Dates: format the resolved value via localisedDate, blank → em dash.
export const getDateCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
  cell: info =>
    formatDateCell(info.getValue<string | Date | null | undefined>()),
});

// Time-of-day: the same instant as its sibling Date column, rendered as the
// local time only. RIGHT-aligned (a fixed-width clock reads as a number, and
// the Date/Time pair then sits flush), blank when there's no value. The Date +
// Time pair is the house shape for any log / ledger / history table (activity
// logs, the stock ledger, repack + VVM history), which is why this is a preset
// rather than a `cell` hand-written per table.
export const getTimeCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
  cell: info => {
    const value = info.getValue<string | Date | null | undefined>();
    return value ? localisedTime(value) : '';
  },
});

// Expiry dates: like getDateCell, but an almost-expired date (≤3 months to
// expiry, past included — the old app's isAlmostExpired /
// MINIMUM_EXPIRY_MONTHS) renders in the error colour, matching the old app's
// ExpiryDateCell.
const EXPIRY_WARNING_MONTHS = 3;

// A date-only wire string ('YYYY-MM-DD', GraphQL NaiveDate) must be read as
// the LOCAL day: `new Date(string)` parses it as UTC midnight, which is the
// PREVIOUS local day anywhere west of UTC — a batch would bold as "expired"
// a day early there, while the domain's day-stable isExpired (string
// comparison against the local day) still said "near expiry". parseISO
// parses date-only strings at local midnight, keeping every calendar-day
// comparison on the store's clock.
const asLocalDay = (value: string | Date): Date =>
  typeof value === 'string' ? parseISO(value) : value;

/**
 * Within the shared near-expiry warning window (or already past it) — the
 * predicate behind getExpiryDateCell's reddening, exported so a consumer can
 * pair the cell with a "Near expiry" row-status badge (ui-standards § table
 * interaction) without restating the threshold.
 */
export const isNearOrPastExpiry = (value: string | Date): boolean =>
  differenceInMonths(asLocalDay(value), new Date()) <= EXPIRY_WARNING_MONTHS;
export const getExpiryDateCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
  cell: info => {
    const value = info.getValue<string | Date | null | undefined>();
    if (!value) return '';
    const almostExpired = isNearOrPastExpiry(value);
    // ACTUALLY expired (the expiry day has arrived — calendar-day comparison,
    // stable across the day) steps up from the near-expiry red to red + bold.
    // Same day semantics as domain/allocation's isExpired, so the cell's
    // tier always agrees with the row's Expired/Near-expiry badge.
    const expired =
      differenceInCalendarDays(asLocalDay(value), new Date()) <= 0;
    return (
      <span
        class={
          expired
            ? `${styles.expiring} ${styles.expired}`
            : almostExpired
              ? styles.expiring
              : undefined
        }
      >
        {localisedDate(value)}
      </span>
    );
  },
});

// Booleans live in their own cell component (dot / check / yes-no variants,
// with the accessible-name treatment) — see BooleanCell + getBooleanCell. So
// does the proportion (fullness) bar — see ProportionCell + getProportionCell,
// resolved by the `volumeUsed` key below.

// Boolean flag (spec/ui-standards/components.md › "Boolean cell (flag in a
// table)"): a centred marker when the value is set, blank otherwise — for a
// column where the fact is the flag, not a Yes/No word (e.g. the patient list's
// Deceased column). The marker carries the state's accessible name — never an
// aria-hidden glyph alone (spec/ui-standards/accessibility › assistive-tech
// parity) — so the caller passes the label (e.g. t('label.deceased')).
export const getFlagCell = <T,>(
  label: string,
  meta?: Meta,
  /**
   * Semantic tone for the CARD chip (table view is untouched — the check
   * stands under its named header there): the card badge slot renders the
   * flag as a StatusBadge chip in this tone. Untoned flags chip neutrally.
   */
  tone?: 'success' | 'warning' | 'error',
  /**
   * Optional marker icon for the card chip (see StatusBadge.icon) — a THUNK,
   * called per row. A bare JSX element would be evaluated once into a single
   * DOM node shared by every flagged row, so mounting one row's chip would
   * steal the icon from the previous (kdd/solid-reactivity-pitfalls).
   */
  icon?: () => JSX.Element
): CellFragment<T> => ({
  meta: { align: 'center', ...meta },
  // TWO renderings, CSS-gated per view (DataTable.module.css § flag cells):
  // in table view the bare check ([data-flag]) stands alone under its named
  // column header; in a card's BADGE slot the header is gone and two flags
  // are indistinguishable checks, so the flag renders as a StatusBadge CHIP
  // ([data-flag-chip]) instead. A body-slot card flag keeps its check +
  // LabelledValue caption.
  cell: info =>
    info.getValue<boolean>() ? (
      <>
        <span data-flag role="img" aria-label={label} title={label}>
          <CheckIcon />
        </span>
        <span data-flag-chip>
          <StatusBadge label={label} tone={tone} icon={icon?.()} />
        </span>
      </>
    ) : (
      ''
    ),
});

// Comment: the resolved string value behind a comment icon + popover (blank →
// nothing). The Comment component renders null when there's no value, so an
// empty cell stays empty. Centre-aligned — the icon is the whole cell.
/**
 * The word standing in for a value the row hasn't got yet — an outbound
 * placeholder line's Batch, an unassigned owner. Not a chip: a chip is a
 * row-STATUS object, and putting one in a value column reclassifies the
 * column and makes the cell with no data the loudest in it. This is the same
 * word, typed so it cannot be mistaken for a value (see the CSS).
 */
export const AbsentValue = (props: { label: string }) => (
  <span class={styles.absentValue}>{props.label}</span>
);

/*
 * The comment column's HEADER — the comment icon, not the word (Carl,
 * 2026-08-19). The column is one icon wide; spelling "Comment" over it was the
 * only thing making it a text-width column, and the glyph names it the same way
 * the cells beneath do. Paired with the `comment` width preset, which is sized
 * for the icon rather than the word.
 *
 * The WORD still names the column everywhere an icon can't stand in — the
 * Columns popover and a card's field label (meta.textLabel, set by
 * getCommentCell below) — and it is the header cell's accessible name here:
 * role="img" + aria-label on the wrapper, the svg itself staying aria-hidden
 * (an unlabelled iconic header would leave the column nameless to a screen
 * reader). `title` gives the same word on hover, for the sighted reader who
 * doesn't recognise the glyph.
 *
 * One glyph per table, then: a table carrying a SECOND comment column (the
 * inbound line table's supplier comment beside the line's own note) spells that
 * one out in words. Two identical glyphs would be indistinguishable at a
 * glance, and a hover title is no way to tell two columns apart.
 */
export const CommentHeader = () => (
  <span
    class={styles.commentHeader}
    role="img"
    aria-label={t('label.comment')}
    title={t('label.comment')}
  >
    <MessageSquareIcon />
  </span>
);

export const getCommentCell = <T,>(meta?: Meta): CellFragment<T> => ({
  // textLabel: the grid header is iconic (CommentHeader), so the column names
  // itself in words for the Columns popover and its card field label. Set by
  // the preset, not per call site — every comment column wants it.
  meta: { align: 'center', textLabel: () => t('label.comment'), ...meta },
  cell: info => <Comment comment={info.getValue<string | null>()} />,
});

// Money in the store's home currency at its minor units, right-aligned,
// locale-formatted (spec/ui-standards/conventions.md). Grouped parent → SUM
// of the leaves, formatted the same way.
export const formatCurrencyCell = (value: number | null | undefined): string =>
  value == null ? '' : formatCurrency(value);

export const getCurrencyCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
  aggregationFn: 'sum',
  cell: info => formatCurrencyCell(info.getValue<number | null | undefined>()),
  aggregatedCell: info =>
    formatCurrencyCell(info.getValue<number | null | undefined>()),
});

// =================================================================================
// getCellDefinition — the common-column-key → cell-type lookup (see
// docs/CELL_TYPES.md). Many keys map to one type (name/description/… → text).
// Covers only the ARGUMENT-FREE cell types; status / boolean / linked-number
// need an argument the key can't supply, so they keep their explicit helper
// (getBooleanCell, a page's StatusChip cell, a linked-order cell). The key set
// is a closed union — an unknown key is a COMPILE ERROR, so an uncommon column
// just calls the specific helper directly. Returns the same CellFragment the
// helpers return; the page still spells identity (`c`), `header` and `sortKey`
// explicitly (kdd/explicit-composition), and can override any field by
// spreading over the result.
// =================================================================================

// The key→kind map (CELL_DEF) and its per-key width overrides live in
// _globalColumnConfig.ts (imported above). CellDefinitionKey is re-exported
// here so consumers can keep importing it from the table-helpers barrel.
export type { CellDefinitionKey };

// The cell RENDERING (meta/cell, no width) for a kind.
const kindFragment = <T,>(kind: CellKind, meta?: Meta): CellFragment<T> => {
  switch (kind) {
    // text / shortText / code share the plain-text renderer; they differ in
    // width (from KIND_WIDTH / the per-key override below) and — for `code` —
    // the monospace font (mono), for code-like fields (item code, batch,
    // location) where fixed-width glyphs read + align better. `mono` rides in
    // first so a caller's meta still wins (can pass mono: false).
    case 'text':
    case 'shortText':
      return getTextCell<T>(meta);
    case 'code':
      return getTextCell<T>({ mono: true, ...meta });
    case 'number':
      return getNumberCell<T>(meta);
    case 'percentage':
      return getPercentageCell<T>(meta);
    case 'currency':
      return getCurrencyCell<T>(meta);
    case 'date':
      return getDateCell<T>(meta);
    case 'time':
      return getTimeCell<T>(meta);
    case 'expiry':
      return getExpiryDateCell<T>(meta);
    case 'comment':
      return getCommentCell<T>(meta);
    case 'chipList':
      return getChipListCell<T>(meta);
    case 'proportion':
      return getProportionCell<T>(meta);
  }
};

// The optional `meta` is merged into the resolved preset's meta (caller wins),
// exactly like the individual helpers — so a per-call tweak (an extra
// headerPosition, a re-align) needs no manual meta merge. To override the
// width, set `size`/`maxSize` after the spread; to override the `cell`, set
// `cell:`
// after it.
export const getCellDefinition = <T,>(
  key: CellDefinitionKey,
  meta?: Meta
): CellFragment<T> => {
  const spec: CellSpec = CELL_DEF[key];
  const width = KIND_WIDTH[spec.kind];
  // An omitted per-key maxSize inherits the kind's cap; an explicit `null`
  // drops it (see CellSpec) — a capped column can't be dragged wider.
  const maxSize =
    spec.maxSize === null ? undefined : (spec.maxSize ?? width.maxSize);
  return {
    ...kindFragment<T>(spec.kind, meta),
    ...sizing(spec.size ?? width.size, maxSize),
  };
};

// =================================================================================
// Sort-key ⇄ column-id mapping for the DataTable's controlled, manual sort.
//
// TanStack keys its SortingState by the resolved column id (a column's
// accessorKey, or its explicit id), but the page speaks sortKey — the GraphQL
// sort field. These are usually equal (a column's accessorKey doubles as its
// sortKey), but a column may sort by a different field than it displays, so the
// two are mapped rather than assumed equal. Pure functions over the column defs
// — no reactivity.
// =================================================================================

// The effective id of a column — the SAME id toColumnDef stamps onto the
// TanStack columnDef, so it matches what TanStack keys
// SortingState/columnOrder/etc. by. Our identity union guarantees one of `id`
// (display/accessor columns) or `key` (String()'d to the id), so this is always
// defined; the `| undefined` is kept only for the empty fallback. Generic over
// the group param G (default string) so it accepts a grouped Column<T,K,G> or a
// plain Column<T,K>.
export const resolvedId = <T, K extends string, G extends string = string>(
  col: Column<T, K, G>
): string | undefined =>
  col.c.id ?? (col.c.key !== undefined ? String(col.c.key) : undefined);

// sortKey (K) → the resolved column id TanStack expects in SortingState. Falls
// back to the key itself when no column declares it (id === sortKey is the
// common case).
export const sortKeyToId = <T, K extends string, G extends string = string>(
  columns: Column<T, K, G>[],
  key: K
): string => {
  const col = columns.find(c => c.sortKey === key);
  return (col && resolvedId(col)) ?? key;
};

// A resolved column id → its sortKey (K), or undefined for an unsortable
// column.
export const sortIdToKey = <T, K extends string, G extends string = string>(
  columns: Column<T, K, G>[],
  id: string
): K | undefined => columns.find(c => resolvedId(c) === id)?.sortKey;
