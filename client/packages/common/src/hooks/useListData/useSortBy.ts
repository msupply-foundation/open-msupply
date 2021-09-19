import { useCallback, useState } from 'react';

export interface SortRule<T> {
  key: keyof T;
  isDesc: boolean;
  direction: 'asc' | 'desc';
}

export interface SortState<T> {
  sortBy: SortRule<T>;
  onChangeSortBy: (newSortKey: keyof T) => void;
}

const getDirection = (isDesc: boolean) => (isDesc ? 'desc' : 'asc');

export const useSortBy = <T>(initialSortBy: SortRule<T>): SortState<T> => {
  const [sortBy, setSortBy] = useState<SortRule<T>>(initialSortBy);

  const onChangeSortBy = useCallback(
    (newSortKey: keyof T) => {
      let newSortBy = sortBy;

      setSortBy(({ key: prevSortKey, isDesc: prevIsDesc }) => {
        const newIsDesc = prevSortKey === newSortKey ? !prevIsDesc : false;
        const direction = getDirection(newIsDesc);
        newSortBy = { key: newSortKey, isDesc: newIsDesc, direction };
        return newSortBy;
      });

      return newSortBy;
    },
    [sortBy]
  );

  return { sortBy, onChangeSortBy };
};
