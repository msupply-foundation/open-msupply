import { useMemo } from 'react';
import { useIsGrouped, SortUtils } from '@openmsupply-client/common';
import { useInboundShipmentColumns } from '../../../DetailView/ContentArea';
import { useInboundItems } from './useInboundItems';
import { useInboundLines } from './useInboundLines';

export const useInboundRows = () => {
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { data: lines } = useInboundLines();
  const { data: items } = useInboundItems();
  const { columns, sortBy } = useInboundShipmentColumns();

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
    isGrouped,
    toggleIsGrouped,
    columns,
    rows,
    lines: sortedLines,
    items: sortedItems,
    sortBy,
  };
};
