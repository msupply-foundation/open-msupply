import { InvoiceNodeType, OmSupplyApi } from '@openmsupply-client/common';

export const getOutboundShipmentCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    toBePicked: number;
  }> => {
    const result = await omSupplyApi.invoiceCounts({
      invoiceType: InvoiceNodeType.OutboundShipment,
    });

    // TODO: Replace with result data once supported by the API
    if (result.invoiceCounts.__typename === 'InvoiceCounts') {
      return {
        toBePicked: Math.floor(Math.random() * 100),
      };
    }

    throw new Error('Argh! Outbound shipment statistics');
  };
