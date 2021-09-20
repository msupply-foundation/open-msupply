import { useState, useEffect } from 'react';

interface Pagination {
  page: number;
  offset: number;
  first: number;
  onChangePage: (newPage: number) => void;
  onChangeFirst: (newFirst: number) => void;
}
export interface PaginationState extends Pagination {
  pagination: Pagination;
}

export const usePagination = (initialFirst = 20): PaginationState => {
  const [first, onChangeFirst] = useState(initialFirst);
  const [offset, onChangeOffset] = useState(0);
  const [page, onChangePage] = useState(0);

  useEffect(() => {
    onChangeOffset(page * first);
  }, [first, page]);

  const pagination = { page, onChangePage, onChangeFirst, offset, first };

  return { pagination, ...pagination };
};
