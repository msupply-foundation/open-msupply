import { useCallback } from 'react';
import { useQuerySelector, UseQueryResult } from '@openmsupply-client/common';
import {
  StocktakeFragment,
  StocktakeLineFragment,
} from '../../operations.generated';
import { useStocktakeNumber } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeSelector = <ReturnType>(
  select: (data: StocktakeFragment) => ReturnType
) => {
  const stocktakeNumber = useStocktakeNumber();

  const api = useStocktakeApi();
  return useQuerySelector(
    api.keys.detail(stocktakeNumber),
    () => api.get.byNumber(stocktakeNumber),
    select
  );
};

export const useStocktakeLines = (
  itemId?: string
): UseQueryResult<StocktakeLineFragment[], unknown> => {
  const selectLines = useCallback(
    (stocktake: StocktakeFragment) => {
      return itemId
        ? stocktake.lines.nodes.filter(
            ({ itemId: stocktakeLineItemId }) => itemId === stocktakeLineItemId
          )
        : stocktake.lines.nodes;
    },
    [itemId]
  );

  return useStocktakeSelector(selectLines);
};
