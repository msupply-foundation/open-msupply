import { useAuthState } from '@openmsupply-client/common';
import { OutboundShipmentApi } from '../api';

export const getOutboundShipmentCountQueryFn =
  (api: OutboundShipmentApi) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const { storeId } = useAuthState();
    const result = await api.invoiceCounts({ storeId });

    return {
      toBePicked: result.invoiceCounts.outbound.toBePicked ?? 0,
    };
  };
