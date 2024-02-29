import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useOutboundReturnLines = (
  stockLineIds: string[],
  itemId?: string
) => {
  const api = useReturnsApi();

  const { data } = useQuery(api.keys.newReturns(itemId), () =>
    api.get.outboundReturnLines(stockLineIds, itemId)
  );

  return data;
};
