import { useCallback, useState } from 'react';

export interface SortRule<T> {
  key: keyof T;
  isDesc: boolean;
  direction: 'asc' | 'desc';
}

export interface SortState<T> {
  sortBy: { key: keyof T; direction: 'asc' | 'desc'; isDesc: boolean };
  onChangeSortBy: (newSortKey: keyof T) => void;
}

const getDirection = (isDesc: boolean) => (isDesc ? 'desc' : 'asc');

export const useSortBy = <T>(initialSortBy: keyof T): SortState<T> => {
  const asSortBy = {
    key: initialSortBy,
    isDesc: false,
    direction: 'asc' as 'asc' | 'desc',
  };

  const [{ key, isDesc, direction }, setSortBy] =
    useState<SortRule<T>>(asSortBy);

  const onChangeSortBy = useCallback((newSortKey: keyof T) => {
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc }) => {
      const newIsDesc = prevSortKey === newSortKey ? !prevIsDesc : false;
      const direction = getDirection(newIsDesc);

      return { key: newSortKey, isDesc: newIsDesc, direction };
    });
  }, []);

  return {
    sortBy: { key, isDesc, direction },
    onChangeSortBy,
  };
};
