import { useCallback } from 'react';
import { UseQueryResult, ArrayUtils } from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../../types';
import { StocktakeFragment } from '../../operations.generated';
import { useStocktakeSelector } from './useStocktakeLines';

export const useStocktakeItems = (): UseQueryResult<StocktakeSummaryItem[]> => {
  const selectLines = useCallback((stocktake: StocktakeFragment) => {
    const { lines } = stocktake;

    return Object.entries(ArrayUtils.groupBy(lines.nodes, 'itemId')).map(
      ([itemId, lines]) => {
        return {
          id: itemId,
          item: lines[0]?.item,
          lines,
        } as StocktakeSummaryItem;
      }
    );
  }, []);

  return useStocktakeSelector(selectLines);
};
