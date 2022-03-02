import { useCallback, useState } from 'react';
import { Column } from '../../ui/layout/tables';
import { RecordWithId } from '../../types';
export interface SortRule<T> {
  key: keyof T | string;
  isDesc?: boolean;
}

export interface SortBy<T> extends SortRule<T> {
  direction: 'asc' | 'desc';
  getSortValue?: (row: T) => string | number;
}
export interface SortController<T extends RecordWithId> {
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: Column<T>) => SortBy<T>;
}

export interface SortState<T extends RecordWithId> extends SortController<T> {
  sort: SortController<T>;
}

const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
  isDesc ? 'desc' : 'asc';

export const useSortBy = <T extends RecordWithId>({
  key: initialSortKey,
  isDesc: initialIsDesc = false,
}: SortRule<T>): SortState<T> => {
  const [sortBy, setSortBy] = useState<SortBy<T>>({
    key: initialSortKey,
    isDesc: initialIsDesc ?? false,
    direction: getDirection(initialIsDesc),
  });

  const onChangeSortBy = useCallback((column: Column<T>) => {
    let newSortBy = sortBy;
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc = false }) => {
      const { key: newSortKey, sortBy: { isDesc: maybeNewIsDesc } = {} } =
        column;
      const newIsDesc =
        prevSortKey === newSortKey ? !prevIsDesc : !!maybeNewIsDesc ?? false;

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
