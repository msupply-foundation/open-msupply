import { Utils } from './utils';
import { Statistics } from './statistics';

export const useDashboard = {
  utils: {
    api: Utils.useDashboardApi,
  },

  statistics: {
    item: Statistics.useItemCounts,
    stock: Statistics.useStockCounts,
  },
};
