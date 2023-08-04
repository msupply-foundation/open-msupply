import { Document } from './document';

export const usePrescription = {
  document: {
    get: Document.usePrescription,
    list: Document.usePrescriptions,
    insert: Document.usePrescriptionInsert,
    update: Document.usePrescriptionUpdate,
    delete: Document.usePrescriptionDelete,
  },
};
