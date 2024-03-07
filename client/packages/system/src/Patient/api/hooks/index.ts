import { Document } from './document';
import { Utils } from './utils';

export const usePatient = {
  utils: {
    api: Utils.usePatientApi,
    /** Get the patient id from the url */
    id: Utils.usePatientId,
    search: Utils.usePatientSearch,
    centralSearch: Utils.useCentralPatientSearch,
    linkPatientToStore: Utils.useLinkPatientToStore,
  },
  document: {
    get: Document.usePatient,
    list: Document.usePatients,
    listAll: Document.usePatientsAll,
    usePatientsPromise: Document.usePatientsPromise,
    insert: Document.useInsertPatient,
    update: Document.useUpdatePatient,
    insertProgramPatient: Document.useInsertProgramPatient,
    updateProgramPatient: Document.useUpdateProgramPatient,
    latestPatientEncounter: Document.useLatestPatientEncounter,
  },
};
