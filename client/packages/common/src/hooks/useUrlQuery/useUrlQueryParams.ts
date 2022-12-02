import { useEffect } from 'react';
import { useUrlQuery } from './useUrlQuery';
import { Column, useLocalStorage } from '@openmsupply-client/common';
import { FilterController } from '../useQueryParams';

// This hook uses the state of the url query parameters (from useUrlQuery hook)
// to provide query parameters and update methods to tables.

export const DEFAULT_RECORDS_PER_PAGE = 20;

interface UrlQueryParams {
  filterKey?: string;
  initialSort?: { key: string; dir: 'desc' | 'asc' };
  filterCondition?: string;
}

export const useUrlQueryParams = ({
  filterKey,
  initialSort,
  filterCondition = 'like',
}: UrlQueryParams = {}) => {
  // do not coerce the filter parameter if the user enters a numeric value
  // if this is parsed as numeric, the query param changes filter=0300 to filter=300
  // which then does not match against codes, as the filter is usually a 'startsWith'
  const { urlQuery, updateQuery } = useUrlQuery({ skipParse: ['filter'] });
  const [storedRowsPerPage] = useLocalStorage(
    '/pagination/rowsperpage',
    DEFAULT_RECORDS_PER_PAGE
  );
  const rowsPerPage = storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE;

  useEffect(() => {
    if (!initialSort) return;

    // Don't want to override existing sort
    if (!!urlQuery['sort']) return;

    const { key: sort, dir } = initialSort;
    updateQuery({ sort, dir: dir === 'desc' ? 'desc' : '' });
  }, [initialSort]);

  const updateSortQuery = (column: Column<any>) => {
    const currentSort = urlQuery['sort'];
    const sort = column.key as string;
    if (sort !== currentSort) {
      updateQuery({ sort, dir: '', page: '' });
    } else {
      const dir = column.sortBy?.direction === 'desc' ? '' : 'desc';
      updateQuery({ dir });
    }
  };

  const updatePaginationQuery = (page: number) => {
    // Page is zero-indexed in useQueryParams store, so increase it by one
    updateQuery({ page: page === 0 ? '' : page + 1 });
  };

  const updateFilterQuery = (key: string, value: string) => {
    updateQuery({ [key]: value });
  };

  const filter: FilterController = {
    onChangeStringFilterRule: (key: string, _, value: string) =>
      updateFilterQuery(key, value),
    onChangeDateFilterRule: () => {},
    onClearFilterRule: key => updateFilterQuery(key, ''),
    filterBy:
      filterKey && urlQuery[filterKey]
        ? {
            [filterKey]: {
              [filterCondition]: String(urlQuery[filterKey]) ?? '',
            },
          }
        : {},
  };
  const queryParams = {
    page: urlQuery.page ? urlQuery.page - 1 : 0,
    offset: urlQuery.page ? (urlQuery.page - 1) * rowsPerPage : 0,
    first: rowsPerPage,
    sortBy: {
      key: urlQuery.sort ?? initialSort?.key ?? '',
      direction: urlQuery.dir ?? initialSort?.dir ?? 'asc',
      isDesc: urlQuery.dir === 'desc',
    },
    filterBy: filter.filterBy,
  };

  return {
    queryParams,
    urlQuery,
    updateSortQuery,
    updatePaginationQuery,
    updateFilterQuery,
    filter,
  };
};
