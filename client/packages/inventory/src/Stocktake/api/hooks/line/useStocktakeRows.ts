import { useMemo } from 'react';
import {
  ArrayUtils,
  ItemNode,
  SortUtils,
  // useIsGrouped,
  useItemUtils,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from '../../../DetailView';
import {
  StocktakeFragment,
  StocktakeLineFragment,
} from '../../operations.generated';
import { StocktakeSummaryItem } from '../../../../types';

const getStocktakeItems = (lines: StocktakeLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      item: lines[0]?.item,
      lines,
    } as StocktakeSummaryItem;
  });

export const useStocktakeRows = (stocktake: StocktakeFragment | undefined) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const lines = stocktake?.lines.nodes; // ?.slice(0, 20);
  const items = getStocktakeItems(lines ?? []);
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const columns = useStocktakeColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  // const { isGrouped } = useIsGrouped('stocktake');
  // const isGrouped = true;

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return items
      ?.filter(item => {
        return matchItem(itemFilter, item.item as ItemNode);
      })
      ?.sort(sorter);
  }, [lines, sortBy.isDesc, sortBy.key, itemFilter]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return lines
      ?.filter(line => {
        return matchItem(itemFilter, line.item);
      })
      ?.sort(sorter);
  }, [lines, sortBy.isDesc, sortBy.key, itemFilter]);

  // const rows = isGrouped ? sortedItems : sortedLines;

  return {
    itemFilter,
    items: sortedItems,
    lines: sortedLines,
    onChangeSortBy: updateSortQuery,
    // rows,
    setItemFilter,
    sortBy,
  };
};
