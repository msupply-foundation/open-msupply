import { useState, useCallback } from 'react';

export const useItemFilter = (searchText = '') => {
  const filterBy = useCallback(
    (value: string) => ({ name: { like: value } }),
    [searchText]
  );
  const [filter, setFilter] = useState(filterBy(searchText));
  return {
    filter,
    onFilter: (searchText: string) => setFilter(filterBy(searchText)),
  };
};

export const usePagination = (first: number = 500) => {
  const [pagination, setPagination] = useState({
    page: 0,
    first,
    offset: 0,
  });

  const onPageChange = useCallback(
    (page: number) =>
      setPagination({
        first: pagination.first,
        offset: pagination.first * page,
        page,
      }),
    []
  );

  return { pagination, onPageChange };
};
