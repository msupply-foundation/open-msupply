import { useMemo } from 'react';
import {
  ItemNode,
  RegexUtils,
  SortUtils,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from '../../../DetailView';
import { useStocktakeLines } from './useStocktakeLines';
import { useStocktakeItems } from './useStocktakeItems';

const useItemFilter = () => {
  const { urlQuery, updateQuery } = useUrlQuery({ skipParse: ['codeOrName'] });
  return {
    itemFilter: urlQuery.codeOrName ?? '',
    setItemFilter: (itemFilter: string) =>
      updateQuery({ codeOrName: itemFilter }),
  };
};

const matchItem = (itemFilter: string, { name, code }: Partial<ItemNode>) => {
  const filter = RegexUtils.escapeChars(itemFilter);
  return (
    RegexUtils.includes(filter, name ?? '') ||
    RegexUtils.includes(filter, code ?? '')
  );
};

export const useStocktakeRows = (isGrouped = true) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'desc' } });
  const { data: lines } = useStocktakeLines();
  const { data: items } = useStocktakeItems();
  const { itemFilter, setItemFilter } = useItemFilter();
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
