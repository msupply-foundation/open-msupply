import { Document } from './document';
import { Line } from './line';
import { Utils } from './utils';

export const usePrescription = {
  document: {
    get: Document.usePrescription,
    fields: Document.usePrescriptionFields,
    list: Document.usePrescriptions,
    insert: Document.usePrescriptionInsert,
    update: Document.usePrescriptionUpdate,
    delete: Document.usePrescriptionDelete,
  },
  line: {
    rows: Line.usePrescriptionRows,
  },
  utils: {
    isDisabled: Utils.usePrescriptionIsDisabled,
  },
};
