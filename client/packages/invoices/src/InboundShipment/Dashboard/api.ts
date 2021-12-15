import { OmSupplyApi } from '@openmsupply-client/common';

export const getInboundShipmentCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    today: number;
    thisWeek: number;
  }> => {
    const result = await omSupplyApi.invoiceCounts({});

    return {
      thisWeek: result.invoiceCounts.inbound.created?.thisWeek ?? 0,
      today: result.invoiceCounts.inbound.created?.today ?? 0,
    };
  };
