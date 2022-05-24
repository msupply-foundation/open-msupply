import { useUrlQuery } from './useUrlQuery';
import { Column } from '@openmsupply-client/common';
import { FilterController } from '../useQueryParams';

// This hook uses the state of the url query parameters to provide query parameters and update methods to tables.

export const useHandleQueryParams = (filterIndex: string) => {
  const { urlQuery, updateQuery } = useUrlQuery();

  const updateSortQuery = (column: Column<any>) => {
    const currentSort = urlQuery?.['sort'];
    const sort = column.key as string;
    if (sort !== currentSort) {
      updateQuery({ sort, dir: '', page: '' });
    } else {
      const dir =
        column?.sortBy?.direction === 'asc' || !column?.sortBy?.direction
          ? 'desc'
          : '';
      updateQuery({ dir });
    }
  };

  const updatePaginationQuery = (page: number) => {
    // Page is zero-indexed in useQueryParams store, so increase it by one
    updateQuery({ page: page + 1 });
  };

  const updateFilterQuery = (key: string, value: string) => {
    updateQuery({ [key]: value });
  };

  const filter: FilterController = {
    onChangeStringFilterRule: (key: string, _, value: string) =>
      updateFilterQuery(key, value),
    onChangeDateFilterRule: () => {},
    onClearFilterRule: () => {},
    filterBy: urlQuery?.[filterIndex]
      ? {
          [filterIndex]: { like: urlQuery?.[filterIndex] ?? '' },
        }
      : {},
  };

  const queryParams = {
    page: urlQuery?.page ? urlQuery.page - 1 : 0,
    offset: urlQuery?.page ? (urlQuery.page - 1) * 20 : 0,
    first: 20,
    sortBy: {
      key: urlQuery.sort,
      direction: urlQuery.dir,
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
