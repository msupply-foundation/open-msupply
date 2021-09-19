import { useState, useEffect } from 'react';

interface PaginationState {
  page: number;
  offset: number;
  first: number;
  onChangePage: (newPage: number) => void;
  onChangeFirst: (newFirst: number) => void;
}

export const usePagination = (initialFirst = 20): PaginationState => {
  const [first, onChangeFirst] = useState(initialFirst);
  const [offset, onChangeOffset] = useState(0);
  const [page, onChangePage] = useState(0);

  useEffect(() => {
    onChangeOffset(page * first);
  }, [first, page]);

  return { page, onChangePage, onChangeFirst, offset, first };
};
