import type { ColumnMeta } from '@tanstack/solid-table';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import type { Column } from './DataTable';

// Shared helpers for the DataTable: cell fragments pages spread into their column defs,
// and the sortKey ⇄ column-id mapping. Kept in one place so a page has a single
// table-helper import.

// =================================================================================
// Cell fragments — spread into an accessorKey-first Column literal (see StocktakesList).
// The column's `accessorKey` supplies the value; these only add what differs from a
// plain text column — alignment (via meta) or a `cell` that formats the value TanStack
// already resolved (info.getValue()). A plain text column needs no helper:
// `{ accessorKey, header, sortKey }` renders it as-is. Each takes an optional `meta` the
// caller can override/extend (e.g. re-align a number column); it's spread over defaults.
// =================================================================================

// TanStack's meta is invariant over TData; helpers are generic and don't fix a row
// type, so use the loosest row type for the meta param and let the spread widen.
type Meta = ColumnMeta<never, unknown>;

const EMPTY_CELL = '—';

// Numbers: right-aligned, value rendered as-is by accessorKey (no cell needed).
export const getNumberCell = <T, K extends string>(meta?: Meta): Partial<Column<T, K>> => ({
  meta: { align: 'right', ...meta },
});

// Dates: format the resolved value via localisedDate, blank → em dash.
export const getDateCell = <T, K extends string>(meta?: Meta): Partial<Column<T, K>> => ({
  meta: { ...meta },
  cell: (info) => {
    const value = info.getValue<string | Date | null | undefined>();
    return value ? localisedDate(value) : EMPTY_CELL;
  },
});

// Booleans: resolved value → localised Yes/No.
export const getBooleanCell = <T, K extends string>(meta?: Meta): Partial<Column<T, K>> => ({
  meta: { ...meta },
  cell: (info) => (info.getValue<boolean>() ? t('common.yes') : t('common.no')),
});

// =================================================================================
// Sort-key ⇄ column-id mapping for the DataTable's controlled, manual sort.
//
// TanStack keys its SortingState by the resolved column id (a column's accessorKey, or
// its explicit id), but the page speaks sortKey — the GraphQL sort field. These are
// usually equal (a column's accessorKey doubles as its sortKey), but a column may sort
// by a different field than it displays, so the two are mapped rather than assumed
// equal. Pure functions over the column defs — no reactivity.
// =================================================================================

// The effective id of a column, mirroring how TanStack derives it: an explicit `id`,
// else the `accessorKey`.
export const resolvedId = <T, K extends string>(col: Column<T, K>): string | undefined =>
  col.id ?? ('accessorKey' in col ? String(col.accessorKey) : undefined);

// sortKey (K) → the resolved column id TanStack expects in SortingState. Falls back to
// the key itself when no column declares it (id === sortKey is the common case).
export const sortKeyToId = <T, K extends string>(columns: Column<T, K>[], key: K): string => {
  const col = columns.find((c) => c.sortKey === key);
  return (col && resolvedId(col)) ?? key;
};

// A resolved column id → its sortKey (K), or undefined for an unsortable column.
export const sortIdToKey = <T, K extends string>(
  columns: Column<T, K>[],
  id: string,
): K | undefined => columns.find((c) => resolvedId(c) === id)?.sortKey;
