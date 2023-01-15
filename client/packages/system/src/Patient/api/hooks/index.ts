import { Document } from './document';
import { Utils } from './utils';

export const usePatient = {
  utils: {
    api: Utils.usePatientApi,
    /** Get the patient id from the url */
    id: Utils.usePatientId,
    search: Utils.usePatientSearch,
  },
  document: {
    encounters: Document.useEncounters,
    get: Document.usePatient,
    list: Document.usePatients,
    listAll: Document.usePatientsAll,
    insert: Document.useInsertPatient,
    update: Document.useUpdatePatient,
    history: Document.useDocumentHistory,
    programEncounters: Document.useProgramEncounters,
  },
};
