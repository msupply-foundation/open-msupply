import { OutboundShipmentApi } from '../api';

export const getOutboundShipmentCountQueryFn =
  (api: OutboundShipmentApi, storeId: string) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const result = await api.invoiceCounts({ storeId });

    return {
      toBePicked: result.invoiceCounts.outbound.toBePicked ?? 0,
    };
  };
