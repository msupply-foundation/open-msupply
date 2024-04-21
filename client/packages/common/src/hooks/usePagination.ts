import { useCallback, useState } from 'react';

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
    [pagination.first]
  );

  return { pagination, onPageChange };
};
