import { useMemo } from 'react';
import { SortUtils, useUrlQueryParams } from '@openmsupply-client/common';
import { usePrescriptionItem } from './usePrescriptionItems';
import { usePrescriptionColumn } from '../../../DetailView/columns';

export const usePrescriptionRows = () => {
  const {
    queryParams: { sortBy },
    updateSortQuery: onChangeSortBy,
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { data: items } = usePrescriptionItem();
  const columns = usePrescriptionColumn({
    onChangeSortBy,
    sortBy,
  });

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const rows = sortedItems;

  return {
    rows,
    items: sortedItems,
  };
};
