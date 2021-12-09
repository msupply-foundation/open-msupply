import { useRef, useState, useEffect } from 'react';
import { useSearchParameters } from '../useSearchParameters';
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
  const searchParams = useSearchParameters();
  const getPageFromSearchParams = () =>
    Math.max(0, searchParams.getNumber('page') - 1);
  const [first, onChangeFirst] = useState(initialFirst);
  const [offset, onChangeOffset] = useState(0);
  const [page, onChangePage] = useState(getPageFromSearchParams());

  const pageRef = useRef(page);

  useEffect(() => {
    onChangeOffset(page * first);
    pageRef.current = page;
    searchParams.set({ page: String(page + 1) });
  }, [first, page]);

  useEffect(() => {
    const newPage = getPageFromSearchParams();
    onChangeOffset(newPage * first);
    pageRef.current = newPage;
  }, [location]);

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
