import { Lines } from './line';
import { Utils } from './utils';

export * from './useInventoryAdjustment';
export * from './useCreateStockLine';

export const useStock = {
  line: {
    get: Lines.useStockLine,
    list: Lines.useStockLines,
    listAll: Lines.useStockLinesAll,
    sorted: Lines.useSortedStockLines,
    update: Lines.useStockLineUpdate,
  },
  utils: {
    api: Utils.useStockApi,
  },
  repack: {
    get: Lines.useRepack,
    list: Lines.useRepacksByStockLine,
    insert: Lines.useInsertRepack,
  },
};
