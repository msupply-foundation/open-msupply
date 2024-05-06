import { RequisitionCountsQuery, getSdk } from './operations.generated';

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
        expired: result?.stockCounts?.expired ?? 0,
        expiringSoon: result?.stockCounts?.expiringSoon ?? 0,
      };
    },
    itemCounts: async (lowStockThreshold: number) => {
      const result = await queries.itemCounts({ storeId, lowStockThreshold });
      return result?.itemCounts?.itemCounts ?? {};
    },
    outboundShipmentCounts: async (): Promise<{
      notShipped: number;
    }> => {
      const result = await queries.outboundShipmentCounts({ storeId });
      return {
        notShipped: result?.invoiceCounts?.outbound.notShipped ?? 0,
      };
    },
    inboundShipmentCounts: async (): Promise<{
      today: number;
      thisWeek: number;
      notDelivered: number;
    }> => {
      const result = await queries.inboundShipmentCounts({ storeId });

      return {
        thisWeek: result?.invoiceCounts?.inbound?.created?.thisWeek ?? 0,
        today: result?.invoiceCounts?.inbound?.created?.today ?? 0,
        notDelivered: result?.invoiceCounts?.inbound?.notDelivered ?? 0,
      };
    },
    requisitionCounts: async (): Promise<
      RequisitionCountsQuery['requisitionCounts']
    > => {
      const result = await queries.requisitionCounts({ storeId });

      return result?.requisitionCounts;
    },
  },
});
