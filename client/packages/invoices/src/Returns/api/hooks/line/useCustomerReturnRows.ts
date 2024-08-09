import { useMemo } from 'react';
import {
  useIsGrouped,
  SortUtils,
  useUrlQueryParams,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useCustomerReturnColumns } from '../../../CustomerDetailView/columns';
import { useCustomerReturn } from '../document/useCustomerReturn';
import { CustomerReturnLineFragment } from '../../operations.generated';
import { CustomerReturnItem } from '../../../../types';

export const useCustomerReturnRows = () => {
  const {
    updateSortQuery: onChangeSortBy,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const columns = useCustomerReturnColumns({
    onChangeSortBy,
    sortBy,
  });

  const { isGrouped, toggleIsGrouped } = useIsGrouped('customerReturn');

  const { data } = useCustomerReturn();
  const lines = data?.lines.nodes;

  const sortedItems = useMemo(() => {
    const items = customerReturnLinesToSummaryItems(lines ?? []).map(item => ({
      ...item,
      [String(sortBy.key)]:
        item.lines[0]?.[sortBy.key as keyof CustomerReturnLineFragment],
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

function customerReturnLinesToSummaryItems(
  lines: CustomerReturnLineFragment[]
): CustomerReturnItem[] {
  const grouped = ArrayUtils.groupBy(lines, line => line.itemId);
  return Object.entries(grouped).map(([itemId, lines]) => ({
    id: itemId,
    itemId,
    lines,
  }));
}
