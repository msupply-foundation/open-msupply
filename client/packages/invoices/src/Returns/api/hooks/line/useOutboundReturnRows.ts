import { useMemo } from 'react';
import {
  useIsGrouped,
  SortUtils,
  useUrlQueryParams,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useOutboundReturnColumns } from '../../../OutboundDetailView/columns';
import { useOutboundReturn } from '../document/useOutboundReturn';
import { OutboundReturnLineFragment } from '../../operations.generated';
import { OutboundReturnItem } from '../../../../types';

export const useOutboundReturnRows = () => {
  const {
    updateSortQuery: onChangeSortBy,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const columns = useOutboundReturnColumns({
    onChangeSortBy,
    sortBy,
  });

  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundReturn');

  const { data } = useOutboundReturn();
  const lines = data?.lines.nodes;

  const sortedItems = useMemo(() => {
    const items = outboundReturnLinesToSummaryItems(lines ?? []).map(item => ({
      ...item,
      [String(sortBy.key)]:
        item.lines[0]?.[sortBy.key as keyof OutboundReturnLineFragment],
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

function outboundReturnLinesToSummaryItems(
  lines: OutboundReturnLineFragment[]
): OutboundReturnItem[] {
  const grouped = ArrayUtils.groupBy(lines, line => line.itemId);
  return Object.entries(grouped).map(([itemId, lines]) => ({
    id: itemId,
    itemId,
    lines,
  }));
}
