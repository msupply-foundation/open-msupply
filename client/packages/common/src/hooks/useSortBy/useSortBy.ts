import { useCallback, useState } from 'react';

export interface SortRule<T> {
  key: keyof T;
  isDesc?: boolean;
}

export interface SortBy<T> extends SortRule<T> {
  direction: 'asc' | 'desc';
}
export interface SortState<T> {
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: SortRule<T>) => void;
}

const getDirection = (isDesc: boolean) => (isDesc ? 'desc' : 'asc');

export const useSortBy = <T>({
  key: initialSortKey,
  isDesc: initialIsDesc = false,
}: SortRule<T>): SortState<T> => {
  const [{ key, isDesc }, setSortBy] = useState({
    key: initialSortKey,
    isDesc: initialIsDesc,
  });

  const onChangeSortBy = useCallback((newSortRule: SortRule<T>) => {
    console.log('-------------------------------------------');
    console.log('newSortRule', newSortRule);
    console.log('-------------------------------------------');
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc }) => {
      const { key: newSortKey, isDesc: maybeNewIsDesc } = newSortRule;
      const newIsDesc =
        prevSortKey === newSortKey ? !prevIsDesc : maybeNewIsDesc ?? false;
      return { key: newSortKey, isDesc: newIsDesc };
    });
  }, []);

  return {
    sortBy: { key, isDesc, direction: getDirection(isDesc) },
    onChangeSortBy,
  };
};
