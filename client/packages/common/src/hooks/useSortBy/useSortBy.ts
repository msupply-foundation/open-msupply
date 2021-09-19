import { useCallback, useState } from 'react';

export interface SortRule<T> {
  key: keyof T;
  isDesc: boolean;
}

interface SortState<T> {
  sortBy: { key: keyof T; direction: 'asc' | 'desc'; isDesc: boolean };
  onChangeSortBy: (newSortKey: keyof T) => void;
}

export const useSortBy = <T>(initialSortBy: SortRule<T>): SortState<T> => {
  const [{ key, isDesc }, setSortBy] = useState(initialSortBy);

  const onChangeSortBy = useCallback((newSortKey: keyof T) => {
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc }) => {
      const newIsDesc = prevSortKey === newSortKey ? !prevIsDesc : false;
      return { key: newSortKey, isDesc: newIsDesc };
    });
  }, []);

  return {
    sortBy: { key, isDesc, direction: isDesc ? 'desc' : 'asc' },
    onChangeSortBy,
  };
};
