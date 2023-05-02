import { Utils } from './utils';
import { Statistics } from './statistics';

export const useDashboard = {
  utils: {
    api: Utils.useDashboardApi,
  },

  statistics: {
    item: Statistics.useItemCounts,
    inbound: Statistics.useInboundCounts,
    outbound: Statistics.useOutboundCounts,
    requisitions: Statistics.useRequisitionCounts,
    stock: Statistics.useStockCounts,
  },
};
