import { Document } from './document';
import { Utils } from './utils';

export const useEncounter = {
  utils: {
    api: Utils.useEncounterApi,
  },

  document: {
    list: Document.useEncounters,
    insert: Document.useInsertEncounter,
    update: Document.useUpdateEncounter,
  },
};
