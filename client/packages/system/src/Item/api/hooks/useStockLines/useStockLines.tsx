import { useItem } from '../useItem';

export const useStockLines = (itemId: string | undefined) => {
  const queryState = useItem(itemId);
  const { data } = queryState;
  const { availableBatches } = data ?? {};

  return { ...queryState, data: availableBatches };
};
