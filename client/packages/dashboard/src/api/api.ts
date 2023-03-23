import { getSdk } from './operations.generated';

export type DashboardQueries = ReturnType<typeof getSdk>;

export const getDashboardQueries = (
  queries: DashboardQueries,
  storeId: string
) => ({
  get: {
    stockCounts: async () => {
      const result = await queries.stockCounts({
        storeId,
        daysTillExpired: 30,
      });
      return {
        expired: result?.stockCounts.expired ?? 0,
        expiringSoon: result?.stockCounts.expiringSoon ?? 0,
      };
    },
    itemCounts: async (lowStockThreshold: number) => {
      const result = await queries.itemCounts({ storeId, lowStockThreshold });
      return result?.itemCounts?.itemCounts ?? {};
    },
  },
});
