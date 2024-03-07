import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useGenerateInboundReturnLines = (
  outboundShipmentLineIds: string[]
) => {
  const api = useReturnsApi();

  const { data } = useQuery(api.keys.newReturns(), () =>
    api.get.inboundReturnLines(outboundShipmentLineIds)
  );

  return data;
};
