import { useEffect } from 'react';
import { useUrlQuery } from './useUrlQuery';
import {
  Column,
  Formatter,
  RecordWithId,
  useLocalStorage,
} from '@openmsupply-client/common';
import { FilterBy, FilterController, SortBy } from '../useQueryParams';

// This hook uses the state of the url query parameters (from useUrlQuery hook)
// to provide query parameters and update methods to tables.

export const DEFAULT_RECORDS_PER_PAGE = 20;

export interface UrlQuerySort {
  key: string;
  dir: 'desc' | 'asc';
}
interface UrlQueryParams {
  filterKey?: string | string[];
  initialSort?: UrlQuerySort;
  filterCondition?: string;
  additionalFilters?: { key: string; condition?: string; value?: string }[];
}

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy: FilterBy | null;
};

export const useUrlQueryParams = ({
  filterKey,
  initialSort,
  filterCondition = 'like',
  additionalFilters = [],
}: UrlQueryParams = {}) => {
  // do not coerce the filter parameter if the user enters a numeric value
  // if this is parsed as numeric, the query param changes filter=0300 to filter=300
  // which then does not match against codes, as the filter is usually a 'startsWith'
  const skipParse = filterKey
    ? typeof filterKey === 'string'
      ? [filterKey]
      : filterKey
    : ['filter'];
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse,
  });
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

  const updateSortQuery = <T extends RecordWithId>(column: Column<T>) => {
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

  const getFilterBy = () => {
    const filterBy: FilterBy = {};

    const filterKeyArray: string[] = !filterKey
      ? []
      : typeof filterKey === 'string'
      ? [filterKey]
      : filterKey;

    filterKeyArray.reduce<FilterBy>((prev, key) => {
      const queryValue = urlQuery[key];
      if (!queryValue) return prev;

      filterBy[key] = {
        [filterCondition]: String(queryValue),
      };
      return prev;
    }, {}),
      additionalFilters.forEach(filter => {
        if (urlQuery[filter.key]) {
          let filterValue = urlQuery[filter.key];
          switch (filterValue) {
            case 'true':
              filterValue = true;
              break;
            case 'false':
              filterValue = false;
              break;
          }
          if (filter.condition === 'between') {
            if (filter.key) {
              const filterItems = String(urlQuery[filter.key]).split('_');
              const dateAfter = filterItems[0]
                ? new Date(filterItems[0])
                : null;
              const dateBefore = filterItems[1]
                ? new Date(filterItems[1])
                : null;

              if (filter.key.includes('datetime')) {
                filterBy[filter.key] = {
                  afterOrEqualTo: Formatter.naiveDateTime(dateAfter),
                  beforeOrEqualTo: Formatter.naiveDateTime(dateBefore),
                };
              } else {
                filterBy[filter.key] = {
                  afterOrEqualTo: Formatter.naiveDate(dateAfter),
                  beforeOrEqualTo: Formatter.naiveDate(dateBefore),
                };
              }
            }
          } else if (filter.condition) {
            filterBy[filter.key] = {
              [filter.condition]: filterValue,
            };
          } else {
            filterBy[filter.key] = {
              like: filterValue,
            };
          }
        }
      });

    return filterBy;
  };

  const filter: FilterController = {
    onChangeStringFilterRule: (key: string, _, value: string) =>
      updateFilterQuery(key, value),
    onChangeDateFilterRule: (key: string, _, value: Date | Date[]) => {
      if (Array.isArray(value)) {
        const startDate =
          typeof value[0] == 'string' ? value[0] : value[0]?.toISOString();
        const endDate =
          typeof value[1] == 'string' ? value[1] : value[1]?.toISOString();

        updateQuery({
          [key]: {
            from: startDate,
            to: endDate,
          },
        });
      } else {
        const d = typeof value == 'string' ? value : value?.toISOString();
        updateQuery({ [key]: d });
      }
    },
    onClearFilterRule: key => updateFilterQuery(key, ''),
    filterBy: getFilterBy(),
  };
  const queryParams = {
    page:
      urlQuery['page'] && typeof urlQuery['page'] === 'number'
        ? urlQuery['page'] - 1
        : 0,
    offset:
      urlQuery['page'] && typeof urlQuery['page'] === 'number'
        ? (urlQuery['page'] - 1) * rowsPerPage
        : 0,
    first: rowsPerPage,
    sortBy: {
      key: urlQuery['sort'] ?? '',
      direction: urlQuery['dir'] ?? 'asc',
      isDesc: urlQuery['dir'] === 'desc',
    } as SortBy<unknown>,
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
