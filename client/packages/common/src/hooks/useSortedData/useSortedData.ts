import { SortRule, SortBy, getDataSorter } from '@openmsupply-client/common';
import { ObjectWithStringKeys } from './../../types/utility';
import { useEffect, useState } from 'react';
import { useSortBy } from '../useSortBy';

interface SortedDataState<T extends ObjectWithStringKeys> {
  sortedData: T[];
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: SortRule<T>) => void;
}

export const useSortedData = <T extends Record<string, unknown>>(
  data: T[],
  initialSortBy: SortRule<T>
): SortedDataState<T> => {
  const { sortBy, onChangeSortBy } = useSortBy(initialSortBy);
  const [sortedData, setSortedData] = useState(data);

  useEffect(() => {
    setSortedData(data.sort(getDataSorter(sortBy.key, !!sortBy.isDesc)));
  }, [sortBy]);

  useEffect(() => {
    setSortedData(data);
  }, [data]);

  return { sortedData, sortBy, onChangeSortBy };
};
