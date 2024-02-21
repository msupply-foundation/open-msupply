import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useOutboundReturnLines = (stockLineIds: string[]) => {
  const api = useReturnsApi();

  const { data } = useQuery(api.keys.newReturns(), () =>
    api.get.outboundReturnLines(stockLineIds)
  );

  return data;
};
