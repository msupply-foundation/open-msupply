import { useMemo } from 'react';
import { SortUtils, useQueryParamsStore } from '@openmsupply-client/common';
import { useOutboundItems } from './useOutboundItems';
import { useOutboundLines } from './useOutboundLines';
import { useOutboundColumns } from './../../../DetailView/columns';

export const useOutboundRows = (isGrouped = true) => {
  const { sort } = useQueryParamsStore();
  const { sortBy, onChangeSortBy } = sort;
  const { data: lines } = useOutboundLines();
  const { data: items } = useOutboundItems();
  const columns = useOutboundColumns({ onChangeSortBy, sortBy });
  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(lines ?? [])].sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc]);

  const rows = isGrouped ? sortedItems : sortedLines;

  return {
    rows,
    lines: sortedLines,
    items: sortedItems,
    onChangeSortBy,
    sortBy,
  };
};
