import { Document } from './document';
import { Registry } from './registry';
import { Utils } from './utils';

export const useEncounter = {
  utils: {
    api: Utils.useEncounterApi,
    id: Utils.useEncounterId,
  },

  document: {
    get: Document.useEncounter,
    list: Document.useEncounters,
    insert: Document.useInsertEncounter,
    update: Document.useUpdateEncounter,
    upsert: Document.useUpsertEncounter,
  },

  registry: {
    byProgram: Registry.useRegistryByProgram,
  },
};
