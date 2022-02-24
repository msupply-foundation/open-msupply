import { Item, StockLine } from '@openmsupply-client/common';
import { UseQueryResult } from 'react-query';
import { useItem } from '../useItem/useItem';

export const useStockLines = (
  itemCode: string
): Omit<UseQueryResult<Item>, 'data'> & { data?: StockLine[] } => {
  const queryState = useItem(itemCode);

  const { data } = queryState;

  const { availableBatches } = data ?? {};

  return { ...queryState, data: availableBatches?.nodes };
};
