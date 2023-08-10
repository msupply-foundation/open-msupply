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
    stockLines: Line.usePrescriptionLine,
    rows: Line.usePrescriptionRows,
    delete: Line.usePrescriptionDeleteLines,
    deleteSelected: Line.usePrescriptionDeleteSelectedLines,
    save: Line.usePrescriptionSaveLines,
  },
  utils: {
    isDisabled: Utils.usePrescriptionIsDisabled,
  },
};
