import { Document } from './document';
import { Line } from './line';
import { Utils } from './utils';

export const usePrescription = {
  document: {
    get: Document.usePrescription,
    getById: Document.usePrescriptionById,
    fields: Document.usePrescriptionFields,
    insert: Document.usePrescriptionInsert,
    update: Document.usePrescriptionUpdate,
    delete: Document.usePrescriptionDelete,
    deleteRows: Document.usePrescriptionDeleteRows,
  },
  line: {
    stockLines: Line.usePrescriptionLine,
    rows: Line.usePrescriptionRows,
    delete: Line.usePrescriptionDeleteLines,
    deleteSelected: Line.usePrescriptionDeleteSelectedLines,
    deleteAll: Line.usePrescriptionDeleteAllLines,
    save: Line.usePrescriptionSaveLines,
  },
  utils: {
    isDisabled: Utils.usePrescriptionIsDisabled,
  },
};

export * from './usePrescriptionList';
