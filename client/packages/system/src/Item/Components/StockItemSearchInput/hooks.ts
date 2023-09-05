import { useState, useCallback } from 'react';

export const useOrganisationFilter = (searchText = '') => {
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

export const usePagination = () => {
  const [pagination, setPagination] = useState({
    page: 0,
    first: 1000,
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
