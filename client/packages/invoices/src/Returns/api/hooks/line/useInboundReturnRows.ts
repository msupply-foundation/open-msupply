import { useMemo } from 'react';
import {
  useIsGrouped,
  SortUtils,
  useUrlQueryParams,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useInboundReturnColumns } from '../../../InboundDetailView/columns';
import { useInboundReturn } from '../document/useInboundReturn';
import { InboundReturnLineFragment } from '../../operations.generated';
import { InboundReturnItem } from 'packages/invoices/src/types';

export const useInboundReturnRows = () => {
  const {
    updateSortQuery: onChangeSortBy,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const columns = useInboundReturnColumns({
    onChangeSortBy,
    sortBy,
  });

  // OK SO WHEN WE TOGGLE THIS ON THINGS BE CRASHING RIP
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundReturn');

  const { data } = useInboundReturn();

  const lines = data?.lines.nodes;

  const items = inboundReturnLinesToSummaryItems(lines ?? []).map(item => ({
    ...item,
    [String(sortBy.key)]:
      item.lines[0]?.[sortBy.key as keyof InboundReturnLineFragment],
  }));

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

function inboundReturnLinesToSummaryItems(
  lines: InboundReturnLineFragment[]
): InboundReturnItem[] {
  const grouped = ArrayUtils.groupBy(lines, line => line.itemId);
  return Object.entries(grouped).map(([itemId, lines]) => ({
    id: itemId,
    itemId,
    lines,
  }));
}
