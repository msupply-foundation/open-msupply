import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from '../localStorage';

const DEFAULT_RECORDS_PER_PAGE = 20;

export const useUserPreferencePagination = () => {
  const [storedRowsPerPage] = useLocalStorage(
    '/pagination/rowsperpage',
    DEFAULT_RECORDS_PER_PAGE
  );

  const [pagination, setPagination] = useState({
    page: 0,
    first: storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE,
    offset: 0,
  });

  useEffect(() => {
    const newPagination = {
      page: 0,
      first: storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE,
      offset: 0,
    };
    setPagination(newPagination);
  }, [storedRowsPerPage]);

  const updateUserPreferencePagination = useCallback(
    (page: number) =>
      setPagination({
        first: pagination.first,
        offset: pagination.first * page,
        page,
      }),
    [pagination.first]
  );

  return { pagination, updateUserPreferencePagination };
};
