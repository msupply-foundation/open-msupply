import { Document } from './document';
import { Utils } from './utils';
export * from './useLocationList';

export const useLocation = {
  document: {
    update: Document.useLocationUpdate,
    delete: Document.useLocationDelete,
    insert: Document.useLocationInsert,
  },
  utils: {
    api: Utils.useLocationApi,
  },
};
