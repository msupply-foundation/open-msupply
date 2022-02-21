import { OutboundShipmentApi } from '../api';

export const getOutboundShipmentCountQueryFn =
  (api: OutboundShipmentApi) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const result = await api.invoiceCounts({});

    return {
      toBePicked: result.invoiceCounts.outbound.toBePicked ?? 0,
    };
  };
