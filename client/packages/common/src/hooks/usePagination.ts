import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from '../localStorage';

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

const DEFAULT_RECORDS_PER_PAGE = 20;

// const rowsPerPage = storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE;
const rowsPerPage = DEFAULT_RECORDS_PER_PAGE;

export const usePaginationRow = () => {
  const [storedRowsPerPage] = useLocalStorage(
    '/pagination/rowsperpage',
    DEFAULT_RECORDS_PER_PAGE
  );

  const [paginationRow, setPaginationRow] = useState({
    page: 0,
    first: storedRowsPerPage ?? rowsPerPage,
    offset: 0,
    // total: total,
  });

  useEffect(() => {
    const newPaginationRow = {
      page: 0,
      first: storedRowsPerPage ?? DEFAULT_RECORDS_PER_PAGE,
      offset: 0,
    };
    setPaginationRow(newPaginationRow);
  }, [storedRowsPerPage]);

  const updatePaginationRows = useCallback(
    (page: number) =>
      setPaginationRow({
        first: paginationRow.first,
        offset: paginationRow.first * page,
        page,
      }),
    [paginationRow.first]
  );

  // const updatePaginationRows = (page: number) => {
  //   // Page is zero-indexed in useQueryParams store, so increase it by one
  //   setPaginationRow({
  //     first: paginationRow.first,
  //     offset: paginationRow.first * page,
  //     page: page,
  //     // total: total,
  //   }),
  //     [paginationRow.first];
  // };
  return { paginationRow, updatePaginationRows };
};
