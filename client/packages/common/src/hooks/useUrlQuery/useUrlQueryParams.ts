import { useCallback, useEffect } from 'react';
import {
  NESTED_SPLIT_CHAR,
  RANGE_SPLIT_CHAR,
  UrlQueryValue,
  useUrlQuery,
} from './useUrlQuery';
import {
  Column,
  Formatter,
  RecordWithId,
  useLocalStorage,
} from '@openmsupply-client/common';
import {
  FilterBy,
  FilterByWithBoolean,
  FilterController,
  SortBy,
} from '../useQueryParams';

// This hook uses the state of the url query parameters (from useUrlQuery hook)
// to provide query parameters and update methods to tables.

export const DEFAULT_RECORDS_PER_PAGE = 20;

export interface UrlQuerySort {
  key: string;
  dir: 'desc' | 'asc';
}

interface Filter {
  key: string;
  condition?: string;
  value?: string;
}
interface UrlQueryParams {
  initialSort?: UrlQuerySort;
  filters?: Filter[];
}

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy: FilterBy | null;
};

export const useUrlQueryParams = ({
  initialSort,
  filters = [],
}: UrlQueryParams = {}) => {
  // do not coerce the filter parameter if the user enters a numeric value
  // if this is parsed as numeric, the query param changes filter=0300 to filter=300
  // which then does not match against codes, as the filter is usually a 'startsWith'
  const skipParse = filters.length > 0 ? filters.map(f => f.key) : ['filter'];
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
  }, [initialSort, updateQuery, urlQuery]);

  // Changes sort key or, if the sort key is already selected, toggles the sort direction.
  const updateSortQuery = useCallback(
    <T extends RecordWithId>(column: Column<T>) => {
      const currentSort = urlQuery['sort'];
      const sort = column.key as string;
      if (sort !== currentSort) {
        // change sort key
        updateQuery({ sort, dir: '', page: '' });
      } else {
        // toggle sort direction
        const dir = column.sortBy?.direction === 'desc' ? '' : 'desc';
        updateQuery({ dir });
      }
    },
    [updateQuery, urlQuery]
  );

  const updatePaginationQuery = (page: number) => {
    // Page is zero-indexed in useQueryParams store, so increase it by one
    updateQuery({ page: page === 0 ? '' : page + 1 });
  };

  const updateFilterQuery = (key: string, value: string) => {
    updateQuery({ [key]: value });
  };

  const getFilterBy = (): FilterByWithBoolean =>
    filters.reduce<FilterByWithBoolean>((prev, filter) => {
      const filterValue = getFilterValue(urlQuery, filter.key);
      if (filterValue === undefined) return prev;
      // create a new object to prevent mutating the existing filter
      const f = { ...filter };

      const [key, nestedKey] = f.key.split(NESTED_SPLIT_CHAR);
      if (f.key.includes(NESTED_SPLIT_CHAR)) {
        f.key = key ?? '';
      }

      prev[f.key] = getFilterEntry(f, filterValue, nestedKey);
      return prev;
    }, {});

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
      key: urlQuery['sort'] ?? initialSort?.key ?? '',
      direction: urlQuery['dir'] ?? initialSort?.dir ?? 'asc',
      isDesc: (urlQuery['dir'] ?? initialSort?.dir) === 'desc',
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

const getFilterValue = (
  urlQuery: Record<string, UrlQueryValue>,
  key: string
) => {
  switch (urlQuery[key]) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return urlQuery[key];
  }
};

const getFilterEntry = (
  filter: Filter,
  filterValue: UrlQueryValue,
  nestedKey?: string
) => {
  if (filter.condition === 'between' && filter.key) {
    const filterItems = String(filterValue).split(RANGE_SPLIT_CHAR);
    const dateAfter = filterItems[0] ? new Date(filterItems[0]) : null;
    const dateBefore = filterItems[1] ? new Date(filterItems[1]) : null;

    if (filter.key.toLowerCase().includes('datetime')) {
      return {
        afterOrEqualTo: Formatter.toIsoString(dateAfter),
        beforeOrEqualTo: Formatter.toIsoString(dateBefore),
      };
    }
    return {
      afterOrEqualTo: Formatter.naiveDate(dateAfter),
      beforeOrEqualTo: Formatter.naiveDate(dateBefore),
    };
  }
  const condition = filter.condition ? filter.condition : 'like';
  if (condition === '=') {
    return Boolean(filterValue);
  }

  if (nestedKey) {
    return {
      [nestedKey]: {
        [condition]: filterValue,
      },
    };
  } else {
    return {
      [condition]: filterValue,
    };
  }
};
