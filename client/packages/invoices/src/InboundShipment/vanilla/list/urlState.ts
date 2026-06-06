import { FilterBy } from '@openmsupply-client/common';
import { ListParams } from './listData';

export const PAGE_SIZE = 20;

const DEFAULT_SORT_KEY = 'invoiceNumber';
const DEFAULT_SORT_DESC = true;

export interface FilterState {
  search: string;
  status: string[];
}

const isExtraSmallScreen = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 600px)').matches;

/** Read the in-page list params from window.location.search. */
export const readListParams = (): { params: ListParams; filter: FilterState } => {
  const sp = new URLSearchParams(window.location.search);

  const page = Math.max(0, Number(sp.get('page') ?? '0') || 0);
  const sortKey = sp.get('sort') ?? DEFAULT_SORT_KEY;
  const sortDesc = sp.has('dir')
    ? sp.get('dir') === 'desc'
    : DEFAULT_SORT_DESC;

  const search = sp.get('search') ?? '';
  // On mobile, default to the NEW/DELIVERED statuses (matches React list).
  const statusParam = sp.get('status');
  const status = statusParam
    ? statusParam.split(',').filter(Boolean)
    : isExtraSmallScreen() && statusParam === null
      ? ['NEW', 'DELIVERED']
      : [];

  const filter: FilterState = { search, status };

  return {
    params: {
      first: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sortKey,
      sortDesc,
      filterBy: buildFilterBy(filter),
    },
    filter,
  };
};

export const buildFilterBy = (filter: FilterState): FilterBy | null => {
  const filterBy: Record<string, unknown> = {};
  if (filter.search.trim())
    filterBy['otherPartyName'] = { like: filter.search.trim() };
  if (filter.status.length) filterBy['status'] = { equalAny: filter.status };
  return Object.keys(filterBy).length ? (filterBy as FilterBy) : null;
};

interface WriteParams {
  page?: number;
  sortKey?: string;
  sortDesc?: boolean;
  filter?: FilterState;
}

/**
 * Merge params into the URL. Page changes push a new history entry; sort/filter
 * changes replace it. Does not notify react-router (the shell doesn't depend on
 * these params) - callers refetch directly.
 */
export const writeListParams = (changes: WriteParams): void => {
  const sp = new URLSearchParams(window.location.search);
  const isPageChange = changes.page !== undefined;

  if (changes.page !== undefined) sp.set('page', String(changes.page));
  if (changes.sortKey !== undefined) sp.set('sort', changes.sortKey);
  if (changes.sortDesc !== undefined)
    sp.set('dir', changes.sortDesc ? 'desc' : 'asc');

  if (changes.filter) {
    const { search, status } = changes.filter;
    if (search.trim()) sp.set('search', search.trim());
    else sp.delete('search');
    if (status.length) sp.set('status', status.join(','));
    else sp.delete('status');
    // Filtering resets to the first page.
    sp.set('page', '0');
  }

  const url = `${window.location.pathname}?${sp.toString()}`;
  if (isPageChange) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
};
