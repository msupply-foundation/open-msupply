import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useGenerateInboundReturnLines = (
  outboundShipmentLineIds: string[],
  returnId: string | undefined,
  itemId: string | undefined
) => {
  const api = useReturnsApi();

  const existingLinesInput =
    returnId && itemId ? { returnId, itemId } : undefined;

  return useQuery(
    api.keys.generatedInboundLines(),
    () =>
      api.get.generateInboundReturnLines({
        outboundShipmentLineIds,
        existingLinesInput,
      }),
    {
      enabled: false, // disables automatic fetching
    }
  );
};
