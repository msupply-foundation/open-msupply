import type { ColumnDefBase, ColumnMeta } from '@tanstack/solid-table';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { Comment } from '../feedback/Comment';
import { CheckIcon } from '../../icons';
import type { Column } from './columnTypes';
import { differenceInMonths } from 'date-fns';
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

const EMPTY_CELL = '—';

// These return a narrow column FRAGMENT — only the fields they set (meta/cell
// + the grouping aggregationFn), typed off ColumnDefBase (the non-identity
// shared column fields), NOT our Column<T,K,G>. Excluding the identity union +
// sortKey/groups extension lets a fragment spread into a Column of ANY (K, G) —
// including a groups-only edit table whose K is `never` — without a `sortKey?:
// never` or identity clash. `cell` matches ColumnDefBase's own signature
// exactly. Exported for ChipListCell (getChipListCell), which builds a fragment
// too.
//
// aggregationFn sets the DEFAULT grouped-parent value (row grouping — see
// DataTable rowGroup): a number column sums its leaves; a date column shows the
// shared date or [multiple]. The stocktake detail table no longer groups, but
// the shared DataTable still supports grouping (card view, other verticals), so
// the fragment keeps carrying the grouping fields.
export type CellFragment<T> = Pick<
  ColumnDefBase<T>,
  'meta' | 'cell' | 'aggregationFn' | 'aggregatedCell'
>;

// Format a date value the ONE way: blank → em dash, else localised.
const formatDateCell = (value: string | Date | null | undefined): string =>
  value ? localisedDate(value) : EMPTY_CELL;

// Numbers: right-aligned.
export const getNumberCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
});

// Dates: format the resolved value via localisedDate, blank → em dash.
export const getDateCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
  cell: info =>
    formatDateCell(info.getValue<string | Date | null | undefined>()),
});

// Expiry dates: like getDateCell, but an almost-expired date (≤3 months to
// expiry, past included — the old app's isAlmostExpired / MINIMUM_EXPIRY_MONTHS)
// renders in the error colour, matching the old app's ExpiryDateCell.
const EXPIRY_WARNING_MONTHS = 3;
export const getExpiryDateCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
  cell: info => {
    const value = info.getValue<string | Date | null | undefined>();
    if (!value) return EMPTY_CELL;
    const almostExpired =
      differenceInMonths(new Date(value), new Date()) <= EXPIRY_WARNING_MONTHS;
    return (
      <span class={almostExpired ? styles.expiring : undefined}>
        {localisedDate(value)}
      </span>
    );
  },
});

// Booleans: resolved value → localised Yes/No.
export const getBooleanCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { ...meta },
  cell: info =>
    info.getValue<boolean>() ? t('messages.yes') : t('messages.no'),
});

// Boolean flag (spec/ui-standards/components.md › "Boolean cell (flag in a
// table)"): a centred marker when the value is set, blank otherwise — for a
// column where the fact is the flag, not a Yes/No word (e.g. the patient list's
// Deceased column). The marker carries the state's accessible name — never an
// aria-hidden glyph alone (spec/ui-standards/accessibility › assistive-tech
// parity) — so the caller passes the label (e.g. t('label.deceased')).
export const getFlagCell = <T,>(
  label: string,
  meta?: Meta
): CellFragment<T> => ({
  meta: { align: 'center', ...meta },
  cell: info =>
    info.getValue<boolean>() ? (
      <span role="img" aria-label={label} title={label}>
        <CheckIcon />
      </span>
    ) : (
      EMPTY_CELL
    ),
});

// Comment: the resolved string value behind a comment icon + popover (blank →
// nothing). The Comment component renders null when there's no value, so an
// empty cell stays empty. Centre-aligned — the icon is the whole cell.
export const getCommentCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'center', ...meta },
  cell: info => <Comment comment={info.getValue<string | null>()} />,
});

// Money: symbol + always two decimals (spec/ui-standards/conventions.md),
// right-aligned, locale-formatted. Grouped parent → SUM of the leaves,
// formatted the same way. The currency code is fixed at USD — the current
// app's default store home currency — until store currency preferences are
// plumbed through; narrowSymbol keeps the symbol a bare "$" in the
// Latin-script locales (the current app's pattern) — ar has no CLDR narrow
// form and falls back to "US$".
const formatCurrencyCell = (value: number | null | undefined): string =>
  value == null
    ? EMPTY_CELL
    : formatNumber(value, {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export const getCurrencyCell = <T,>(meta?: Meta): CellFragment<T> => ({
  meta: { align: 'right', ...meta },
  aggregationFn: 'sum',
  cell: info => formatCurrencyCell(info.getValue<number | null | undefined>()),
  aggregatedCell: info =>
    formatCurrencyCell(info.getValue<number | null | undefined>()),
});

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
