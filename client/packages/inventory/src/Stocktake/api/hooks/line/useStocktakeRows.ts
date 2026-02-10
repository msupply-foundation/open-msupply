import { ArrayUtils } from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../../operations.generated';
import { StocktakeSummaryItem } from '../../../../types';
import { useStocktakeOld } from '..';
import { isStocktakeDisabled } from '../../../../utils';
import { useStocktakeLines } from './useStocktakeLines';
import { useMemo } from 'react';
import { useItemUtils } from '@openmsupply-client/common';

const getStocktakeItems = (lines: StocktakeLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      item: lines[0]?.item,
      lines,
    } as StocktakeSummaryItem;
  });

export const useStocktakeRows = (itemId?: string) => {
  const { data: stocktake } = useStocktakeOld.document.get();
  const { data: lineData, isLoading } = useStocktakeLines(
    stocktake?.id ?? '',
    itemId
  );

  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const lines = lineData?.nodes;

  const filteredLines = useMemo(() => {
    return lines?.filter(item => matchItem(itemFilter, item.item));
  }, [lines, itemFilter]);

  const items = useMemo(() => getStocktakeItems(filteredLines ?? []), [lines]);

  const totalLineCount = lineData?.totalCount ?? 0;
  const isDisabled = !stocktake || isStocktakeDisabled(stocktake);

  return {
    isDisabled,
    isLoading,
    items,
    lines: filteredLines ?? [],
    totalLineCount,
    itemFilter,
    setItemFilter,
  };
};
