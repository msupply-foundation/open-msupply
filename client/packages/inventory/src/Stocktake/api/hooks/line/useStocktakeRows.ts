import { ArrayUtils, useIsGrouped } from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../../operations.generated';
import { StocktakeSummaryItem } from '../../../../types';
import { useStocktake } from '..';
import { isStocktakeDisabled } from '../../../../utils';
import { useStocktakeLines } from './useStocktakeLines';
import { useMemo } from 'react';

const getStocktakeItems = (lines: StocktakeLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      item: lines[0]?.item,
      lines,
    } as StocktakeSummaryItem;
  });

export const useStocktakeRows = () => {
  const { data: stocktake } = useStocktake.document.get();
  const { data: lineData, isLoading } = useStocktakeLines(stocktake?.id ?? '');
  const lines = lineData?.nodes;
  const items = useMemo(() => getStocktakeItems(lines ?? []), [lines]);
  const totalLineCount = lineData?.totalCount ?? 0;
  const { isGrouped } = useIsGrouped('stocktake');
  const rows = isGrouped ? items : lines;
  const isDisabled = !stocktake || isStocktakeDisabled(stocktake);

  return {
    isDisabled,
    isLoading,
    items,
    lines,
    rows,
    totalLineCount,
  };
};
