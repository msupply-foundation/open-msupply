import { useCallback, useEffect } from 'react';
import {
  NESTED_SPLIT_CHAR,
  RANGE_SPLIT_CHAR,
  UrlQueryValue,
  useUrlQuery,
} from './useUrlQuery';
import {
  DateUtils,
  Formatter,
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

interface Filter {
  key: string;
  condition?: string;
  value?: string;
  isNumber?: boolean;
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
  // Do not coerce the filter parameter if the user enters a numeric value
  // If this is parsed as numeric, the query param changes filter=0300 to
  // filter=300 which then does not match against codes, as the filter is
  // usually a 'startsWith'
  const skipParse = filters.length > 0 ? filters.map(f => f.key) : ['filter'];

  const [storedRowsPerPage, setStoredRowsPerPage] = useLocalStorage(
    '/pagination/rowsperpage',
    DEFAULT_RECORDS_PER_PAGE
  );
  const rowsPerPage = storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE;

  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse,
  });

  // Set initial sort on mount
  useEffect(() => {
    if (!initialSort) return;

    // Don't want to override existing sort
    if (urlQuery['sort']) return;

    const { key: sort, dir } = initialSort;
    updateQuery({ sort, dir: dir === 'desc' ? 'desc' : '' });
  }, [initialSort?.key, initialSort?.dir]);

  const updateSortQuery = useCallback(
    (sort: string, dir: 'desc' | 'asc') => {
      updateQuery({ sort, dir: dir === 'asc' ? '' : 'desc' });
    },
    [updateQuery]
  );

  const clearSort = () => updateQuery({ sort: undefined, dir: undefined });

  const updatePaginationQuery = (
    page: number,
    pageSize: number = rowsPerPage
  ) => {
    // Page is zero-indexed in useQueryParams store, so increase it by one
    updateQuery({
      page: page === 0 ? '' : page + 1,
      pageSize:
        pageSize && pageSize !== DEFAULT_RECORDS_PER_PAGE ? pageSize : '',
    });
    setStoredRowsPerPage(pageSize);
  };

  const updateFilterQuery = (key: string, value: string) => {
    updateQuery({ [key]: value });
  };

  const getFilterBy = (): FilterBy =>
    filters.reduce<FilterBy>((prev, filter) => {
      const filterValue = getFilterValue(
        urlQuery,
        filter.key,
        filter?.isNumber
      );
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

  const pageSize =
    urlQuery['pageSize'] && typeof urlQuery['pageSize'] === 'number'
      ? urlQuery['pageSize']
      : rowsPerPage;

  const page =
    urlQuery['page'] && typeof urlQuery['page'] === 'number'
      ? urlQuery['page'] - 1
      : 0;

  const defaultSort = initialSort
    ? { key: initialSort.key, dir: initialSort.dir === 'desc' ? 'desc' : '' }
    : { key: '', dir: 'asc' };

  const direction = urlQuery['dir'] ?? defaultSort.dir;

  const queryParams = {
    page,
    offset: page * pageSize,
    first: pageSize,
    sortBy: {
      key: urlQuery['sort'] ?? defaultSort.key,
      direction,
      isDesc: direction === 'desc',
    } as SortBy<unknown>,
    filterBy: filter.filterBy,
    reportArgs: urlQuery['reportArgs'],
  };

  return {
    queryParams,
    urlQuery,
    updateSortQuery,
    clearSort,
    updatePaginationQuery,
    updateFilterQuery,
    filter,
  };
};

const getFilterValue = (
  urlQuery: Record<string, UrlQueryValue>,
  key: string,
  isNumber?: boolean
) => {
  if (urlQuery[key] === undefined) return undefined;
  if (isNumber === true) {
    return Number(urlQuery[key]);
  } else {
    switch (urlQuery[key]) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return urlQuery[key];
    }
  }
};

const getFilterEntry = (
  filter: Filter,
  filterValue: UrlQueryValue,
  nestedKey?: string
) => {
  if (filter.condition === 'between' && filter.key) {
    const filterItems = String(filterValue).split(RANGE_SPLIT_CHAR);

    const isDateTime = filterItems.some(item =>
      DateUtils.isUrlQueryDateTime(item ?? '')
    );

    // If just "date", we are time zone agnostic, pass the filter straight through
    if (!isDateTime) {
      return {
        // Using `||` to convert "" value to null
        afterOrEqualTo: filterItems[0] || null,
        beforeOrEqualTo: filterItems[1] || null,
      };
    }

    // If using date time, map current time zone to ISO/UTC to send to API
    const dateAfter = filterItems[0] ? new Date(filterItems[0]) : null;
    const dateBefore = filterItems[1] ? new Date(filterItems[1]) : null;
    return {
      afterOrEqualTo: Formatter.toIsoString(dateAfter),
      beforeOrEqualTo: Formatter.toIsoString(dateBefore),
    };
  }

  const condition = filter.condition ? filter.condition : 'like';
  if (condition === '=') {
    return Boolean(filterValue);
  }
  if (condition === 'isNumber') {
    return Number(filterValue);
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
