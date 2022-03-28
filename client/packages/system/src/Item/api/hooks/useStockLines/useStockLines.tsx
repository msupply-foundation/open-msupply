import { useItemById } from '../useItem';

export const useStockLines = (itemId: string | undefined) => {
  const queryState = useItemById(itemId);
  const { data } = queryState;
  const { availableBatches } = data ?? {};
  return { ...queryState, data: availableBatches };
};
