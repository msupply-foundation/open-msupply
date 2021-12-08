import { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const getPageFromSearchParams = () => {
    const paramPage = Number(searchParams.get('page'));
    return Number.isNaN(paramPage) ? 0 : Math.max(0, paramPage - 1);
  };
  const [first, onChangeFirst] = useState(initialFirst);
  const [offset, onChangeOffset] = useState(0);
  const [page, onChangePage] = useState(getPageFromSearchParams());

  const pageRef = useRef(page);

  useEffect(() => {
    onChangeOffset(page * first);
    pageRef.current = page;
    setSearchParams({ page: String(page + 1) });
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
