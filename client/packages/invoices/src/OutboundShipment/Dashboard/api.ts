import { InvoiceNodeType, OmSupplyApi } from '@openmsupply-client/common';

export const getOutboundShipmentCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const result = await omSupplyApi.invoiceCounts({
      type: InvoiceNodeType.OutboundShipment,
    });

    if (result.invoiceCounts.__typename === 'InvoiceCountsConnector') {
      return {
        toBePicked: result.invoiceCounts.toBePicked ?? 0,
      };
    }

    throw new Error('Argh! Outbound shipment statistics');
  };
