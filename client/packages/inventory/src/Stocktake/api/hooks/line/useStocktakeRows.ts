import { useMemo } from 'react';
import {
  ItemNode,
  ItemUtils,
  SortUtils,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from '../../../DetailView';
import { useStocktakeLines } from './useStocktakeLines';
import { useStocktakeItems } from './useStocktakeItems';

export const useStocktakeRows = (isGrouped = true) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'desc' } });
  const { data: lines } = useStocktakeLines();
  const { data: items } = useStocktakeItems();
  const { itemFilter, setItemFilter } = ItemUtils.itemFilter();
  const columns = useStocktakeColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return items
      ?.filter(item => {
        return ItemUtils.matchItem(itemFilter, item.item as ItemNode);
      })
      ?.sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc, itemFilter]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return lines
      ?.filter(line => {
        return ItemUtils.matchItem(itemFilter, line.item);
      })
      ?.sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc, itemFilter]);

  const rows = isGrouped ? sortedItems : sortedLines;

  return {
    rows,
    lines: sortedLines,
    items: sortedItems,
    onChangeSortBy: updateSortQuery,
    sortBy,
    itemFilter,
    setItemFilter,
  };
};
