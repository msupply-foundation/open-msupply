import { Document } from './document';
import { Utils } from './utils';

export const usePatient = {
  utils: {
    api: Utils.usePatientApi,
    id: Utils.usePatientId,
    search: Utils.usePatientSearch,
  },
  document: {
    get: Document.usePatient,
    list: Document.usePatients,
    listAll: Document.usePatientsAll,
    insert: Document.useInsertPatient,
    update: Document.useUpdatePatient,
    history: Document.useDocumentHistory,
  },
};
