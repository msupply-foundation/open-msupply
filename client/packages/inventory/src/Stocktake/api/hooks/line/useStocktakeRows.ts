import { useMemo } from 'react';
import {
  ItemNode,
  SortUtils,
  useItemUtils,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from '../../../DetailView';
import { useStocktakeLines } from './useStocktakeLines';
import { useStocktakeItems } from './useStocktakeItems';

export const useStocktakeRows = (isGrouped = true) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { data: lines } = useStocktakeLines();
  const { data: items } = useStocktakeItems();
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
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
        return matchItem(itemFilter, item.item as ItemNode);
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
        return matchItem(itemFilter, line.item);
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
