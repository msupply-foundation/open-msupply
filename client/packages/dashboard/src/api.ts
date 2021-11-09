import { OmSupplyApi } from '@openmsupply-client/common';

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
