import { useCallback, useState } from 'react';

export interface SortRule<T> {
  key: keyof T | string;
  isDesc?: boolean;
}

export interface SortBy<T> extends SortRule<T> {
  direction: 'asc' | 'desc';
}
export interface SortController<T> {
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: SortRule<T>) => SortBy<T>;
}

export interface SortState<T> extends SortController<T> {
  sort: SortController<T>;
}

const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
  isDesc ? 'desc' : 'asc';

export const useSortBy = <T>({
  key: initialSortKey,
  isDesc: initialIsDesc = false,
}: SortRule<T>): SortState<T> => {
  const [sortBy, setSortBy] = useState<SortBy<T>>({
    key: initialSortKey,
    isDesc: initialIsDesc,
    direction: getDirection(initialIsDesc),
  });

  const onChangeSortBy = useCallback((newSortRule: SortRule<T>) => {
    let newSortBy = sortBy;
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc = false }) => {
      const { key: newSortKey, isDesc: maybeNewIsDesc } = newSortRule;
      const newIsDesc =
        prevSortKey === newSortKey ? !prevIsDesc : maybeNewIsDesc ?? false;

      newSortBy = {
        key: newSortKey,
        isDesc: newIsDesc,
        direction: getDirection(newIsDesc),
      };

      return newSortBy;
    });

    return { ...newSortBy, direction: getDirection(!!newSortBy?.isDesc) };
  }, []);

  return { sortBy, onChangeSortBy, sort: { sortBy, onChangeSortBy } };
};
