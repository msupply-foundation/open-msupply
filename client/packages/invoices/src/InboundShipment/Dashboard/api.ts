import { InboundShipmentApi } from '../api';

export const getInboundShipmentCountQueryFn =
  (api: InboundShipmentApi, storeId: string) =>
  async (): Promise<{
    today: number;
    thisWeek: number;
  }> => {
    const result = await api.invoiceCounts({ storeId });

    return {
      thisWeek: result.invoiceCounts.inbound.created?.thisWeek ?? 0,
      today: result.invoiceCounts.inbound.created?.today ?? 0,
    };
  };
