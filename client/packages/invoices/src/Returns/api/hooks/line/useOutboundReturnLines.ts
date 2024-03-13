import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useOutboundReturnLines = (
  stockLineIds: string[],
  itemId?: string,
  returnId?: string
) => {
  const api = useReturnsApi();

  const { data } = useQuery(api.keys.generatedOutboundLines(itemId), () =>
    api.get.outboundReturnLines(stockLineIds, itemId, returnId)
  );

  return data;
};
