import { Document } from './document';
import { Utils } from './utils';

export const usePatient = {
  api: Utils.usePatientApi,
  document: {
    get: Document.usePatient,
    list: Document.usePatients,
    listAll: Document.usePatientsAll,
    insert: Document.useInsertPatient,
    update: Document.useUpdatePatient,
    history: Document.useDocumentHistory,
  },
};
