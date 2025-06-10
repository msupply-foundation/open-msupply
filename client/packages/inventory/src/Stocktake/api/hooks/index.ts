import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useStocktakeOld = {
  document: {
    get: Document.useStocktake,
    list: Document.useStocktakes,
    listAll: Document.useStocktakesAll,

    delete: Document.useStocktakeDelete,
    deleteSelected: Document.useStocktakeDeleteSelected,
    update: Document.useUpdateStocktake,

    fields: Document.useStocktakeFields,
  },
  line: {
    rows: Lines.useStocktakeRows,
    delete: Lines.useStocktakeDeleteLines,
    deleteSelected: Lines.useStocktakeDeleteSelectedLines,
    zeroQuantities: Lines.useZeroStocktakeLines,
    changeLocation: Lines.useChangeLinesLocation,
    save: Lines.useSaveStocktakeLines,
  },
  utils: {
    api: Utils.useStocktakeApi,
    isDisabled: Utils.useIsStocktakeDisabled,
    selectedRows: Utils.useSelectedRows,
  },
};
