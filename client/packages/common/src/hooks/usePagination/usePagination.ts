import { useRef, useState, useEffect } from 'react';

export interface Pagination {
  page: number;
  offset: number;
  first: number;
}

export interface PaginationController extends Pagination {
  onChangePage: (newPage: number) => void;
  onChangeFirst: (newFirst: number) => void;
  nextPage: () => void;
}

export interface PaginationState extends PaginationController {
  pagination: PaginationController;
}

export const usePagination = (initialFirst = 20): PaginationState => {
  const [first, onChangeFirst] = useState(initialFirst);
  const [offset, onChangeOffset] = useState(0);
  const [page, onChangePage] = useState(0);

  const pageRef = useRef(page);

  useEffect(() => {
    onChangeOffset(page * first);
    pageRef.current = page;
  }, [first, page]);

  const nextPage = () => {
    onChangePage(pageRef.current + 1);
  };

  const pagination = {
    page,
    onChangePage,
    onChangeFirst,
    offset,
    first,
    nextPage,
  };

  return { pagination, ...pagination };
};
