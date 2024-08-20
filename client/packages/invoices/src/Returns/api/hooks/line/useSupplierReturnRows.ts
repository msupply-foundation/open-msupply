import { useMemo } from 'react';
import {
  useIsGrouped,
  SortUtils,
  useUrlQueryParams,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useSupplierReturnColumns } from '../../../SupplierDetailView/columns';
import { useSupplierReturn } from '../document/useSupplierReturn';
import { SupplierReturnLineFragment } from '../../operations.generated';
import { SupplierReturnItem } from '../../../../types';

export const useSupplierReturnRows = () => {
  const {
    updateSortQuery: onChangeSortBy,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const columns = useSupplierReturnColumns({
    onChangeSortBy,
    sortBy,
  });

  const { isGrouped, toggleIsGrouped } = useIsGrouped('supplierReturn');

  const { data } = useSupplierReturn();
  const lines = data?.lines.nodes;

  const sortedItems = useMemo(() => {
    const items = supplierReturnLinesToSummaryItems(lines ?? []).map(item => ({
      ...item,
      [String(sortBy.key)]:
        item.lines[0]?.[sortBy.key as keyof SupplierReturnLineFragment],
    }));

    const currentColumn = columns.find(({ key }) => key === sortBy.key);

    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );

    return [...(items ?? [])].sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc]);

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

function supplierReturnLinesToSummaryItems(
  lines: SupplierReturnLineFragment[]
): SupplierReturnItem[] {
  const grouped = ArrayUtils.groupBy(lines, line => line.itemId);
  return Object.entries(grouped).map(([itemId, lines]) => ({
    id: itemId,
    itemId,
    lines,
  }));
}
