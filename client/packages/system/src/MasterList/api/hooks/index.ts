import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useMasterList = {
  document: {
    get: Document.useMasterList,
    list: Document.useMasterLists,
    listAll: Document.useMasterListsAll,
    listByItemId: Document.useMasterListsByItemId,
    fields: Document.useMasterListFields,
  },
  line: {
    rows: Lines.useMasterListLines,
  },
  utils: {
    api: Utils.useMasterListApi,
  },
};
