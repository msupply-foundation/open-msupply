import { Lines } from './line';
import { Utils } from './utils';

export const useStock = {
  line: {
    get: Lines.useStockLine,
    list: Lines.useStockLines,
    update: Lines.useStockLineUpdate,
  },
  utils: {
    api: Utils.useStockApi,
  },
};
