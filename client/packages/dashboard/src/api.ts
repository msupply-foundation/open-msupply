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

export const getStockCountQueryFn =
  (omSupplyApi: OmSupplyApi) =>
  async (): Promise<{
    expired: number;
    expiringSoon: number;
  }> => {
    const result = await omSupplyApi.stockCounts();
    if (result.stockCounts.__typename === 'StockCountsConnector') {
      return {
        expired: result.stockCounts.expired ?? 0,
        expiringSoon: result.stockCounts.expiringSoon ?? 0,
      };
    }

    throw new Error("Couldn't get stock stats");
  };
