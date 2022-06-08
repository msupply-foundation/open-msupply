import { Document } from './document';
import { Utils } from './utils';

export const useLocation = {
  document: {
    list: Document.useLocations,
    listAll: Document.useLocationsAll,

    update: Document.useLocationUpdate,
    delete: Document.useLocationDelete,
    insert: Document.useLocationInsert,

    next: Document.useNextLocation,
  },
  utils: {
    api: Utils.useLocationApi,
  },
};
