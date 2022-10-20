import { getSdk } from './operations.generated';

export type DashboardApi = ReturnType<typeof getDashboardQueries> & {
  storeId: string;
};
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
    itemStats: async () => {
      const result = await queries.itemStats({ storeId });
      return result?.items.nodes;
    },
  },
});
