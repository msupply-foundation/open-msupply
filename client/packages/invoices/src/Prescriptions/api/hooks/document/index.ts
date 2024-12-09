import { usePrescription } from './usePrescription';
import { usePrescriptionById } from './usePrescriptionById';
import { usePrescriptionDelete } from './usePrescriptionDelete';
import { usePrescriptionDeleteRows } from './usePrescriptionDeleteRows';
import { usePrescriptionFields } from './usePrescriptionFields';
import { usePrescriptionInsert } from './usePrescriptionInsert';
import { usePrescriptionUpdate } from './usePrescriptionUpdate';
import { usePrescriptions } from './usePrescriptions';

export const Document = {
  usePrescription,
  usePrescriptionById,
  usePrescriptions,
  usePrescriptionInsert,
  usePrescriptionUpdate,
  usePrescriptionDelete,
  usePrescriptionDeleteRows,
  usePrescriptionFields,
};
