import { InvoiceNodeType, OmSupplyApi } from '@openmsupply-client/common';

export const getInboundShipmentCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    today: number;
    thisWeek: number;
  }> => {
    const result = await omSupplyApi.invoiceCounts({
      type: InvoiceNodeType.InboundShipment,
    });

    if (result.invoiceCounts.__typename === 'InvoiceCountsConnector') {
      return {
        thisWeek: result.invoiceCounts.created?.thisWeek ?? 0,
        today: result.invoiceCounts.created?.today ?? 0,
      };
    }

    throw new Error('Trouble working out the inbound shipment numbers');
  };
