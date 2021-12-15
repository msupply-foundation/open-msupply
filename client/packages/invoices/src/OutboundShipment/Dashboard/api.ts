import { OmSupplyApi } from '@openmsupply-client/common';

export const getOutboundShipmentCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const result = await omSupplyApi.invoiceCounts({});

    return {
      toBePicked: result.invoiceCounts.outbound.toBePicked ?? 0,
    };
  };
