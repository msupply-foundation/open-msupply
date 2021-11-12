import { ObjectWithStringKeys } from './../../types/utility';
import { useCallback, useState } from 'react';
import { GenericColumnKey } from '../..';

export interface SortRule<T extends ObjectWithStringKeys> {
  key: keyof T | GenericColumnKey;
  isDesc?: boolean;
}

export interface SortBy<T extends ObjectWithStringKeys> extends SortRule<T> {
  direction: 'asc' | 'desc';
}
export interface SortController<T extends ObjectWithStringKeys> {
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: SortRule<T>) => SortBy<T>;
}

export interface SortState<T extends ObjectWithStringKeys>
  extends SortController<T> {
  sort: SortController<T>;
}

const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
  isDesc ? 'desc' : 'asc';

export const useSortBy = <T extends ObjectWithStringKeys>({
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
