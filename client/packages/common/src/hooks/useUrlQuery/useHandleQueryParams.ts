import { useState } from 'react';
import { useUrlQuery } from './useUrlQuery';
import { Column } from '@openmsupply-client/common';

export const useHandleQueryParams = () => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const [currFilterIndex, setCurrFilterIndex] = useState('');

  const updateSortQuery = (column: Column<any>) => {
    const currentSort = urlQuery?.['sort'];
    const sort = column.key as string;
    if (sort !== currentSort) {
      updateQuery({ sort, dir: 'asc', page: 1 });
    } else {
      const dir = column?.sortBy?.direction === 'asc' ? 'desc' : 'asc';
      updateQuery({ dir });
    }
  };

  const updatePaginationQuery = (page: number) => {
    // Page is zero-indexed in useQueryParams store, so increase it by one
    updateQuery({ page: page + 1 });
  };

  const updateFilterQuery = (key: string, value: string) => {
    setCurrFilterIndex(key);
    updateQuery({ [key]: value });
  };

  const queryParams = {
    page: urlQuery.page,
    offset: 0,
    first: 20,
    sortBy: {
      key: urlQuery.sort,
      direction: urlQuery.dir,
      isDesc: urlQuery.dir === 'desc',
    },
    filterBy: { [currFilterIndex]: urlQuery[currFilterIndex] },
  };

  return {
    queryParams,
    urlQuery,
    updateSortQuery,
    updatePaginationQuery,
    updateFilterQuery,
  };
};
