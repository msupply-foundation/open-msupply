import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useMasterListOld = {
  document: {
    list: Document.useMasterLists,
    listAll: Document.useMasterListsAll,
    listByItemId: Document.useMasterListsByItemId,
  },
  line: {
    rows: Lines.useMasterListLines,
  },
  utils: {
    api: Utils.useMasterListApi,
  },
};
