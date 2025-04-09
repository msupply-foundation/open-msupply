import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';
export { useMasterLists } from './useMasterLists';

export const useMasterListOld = {
  document: {
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
