import { Utils } from './utils';
import { Statistics } from './statistics';

export const useDashboard = {
  utils: {
    api: Utils.useDashboardApi,
  },

  statistics: {
    inbound: Statistics.useInboundCounts,
    requisitions: Statistics.useRequisitionCounts,
  },
};
