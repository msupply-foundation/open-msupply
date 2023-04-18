import { useMemo } from 'react';
import {
  SortUtils,
  RegexUtils,
  useUrlQuery,
  ItemNode,
} from '@openmsupply-client/common';
import { useRequestColumns } from '../../../DetailView/columns';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

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

export const useRequestLines = () => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter } = useItemFilter();
  const { columns, onChangeSortBy, sortBy } = useRequestColumns();
  const { lines, minMonthsOfStock } = useRequestFields([
    'lines',
    'minMonthsOfStock',
  ]);

  const sorted = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    const sorted = getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;

    if (on) {
      return sorted.filter(
        item =>
          item.itemStats.availableStockOnHand <
            item.itemStats.averageMonthlyConsumption * minMonthsOfStock &&
          matchItem(itemFilter, item.item)
      );
    } else {
      return sorted.filter(item => matchItem(itemFilter, item.item));
    }
  }, [sortBy.key, sortBy.isDesc, lines, on, minMonthsOfStock, itemFilter]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
};
