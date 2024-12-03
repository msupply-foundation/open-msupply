import { Line } from './line';

export const usePrescription = {
  line: {
    stockLines: Line.usePrescriptionLine,
    rows: Line.usePrescriptionRows,
    delete: Line.usePrescriptionDeleteLines,
    deleteSelected: Line.usePrescriptionDeleteSelectedLines,
    deleteAll: Line.usePrescriptionDeleteAllLines,
    save: Line.usePrescriptionSaveLines,
  },
};

export * from './usePrescriptionList';
export * from './usePrescriptionSingle';
export * from './utils';
