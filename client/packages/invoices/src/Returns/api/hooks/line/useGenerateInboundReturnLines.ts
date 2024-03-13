import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useGenerateInboundReturnLines = (
  outboundShipmentLineIds: string[]
) => {
  const api = useReturnsApi();

  return useQuery(
    api.keys.generatedInboundLines(),
    () => api.get.inboundReturnLines(outboundShipmentLineIds),
    {
      enabled: false, // disables automatic fetching
    }
  );
};
