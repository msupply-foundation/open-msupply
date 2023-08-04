import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionNumber } from '../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';
import { usePrescription } from './usePrescription';

export const usePrescriptionFields = <
  KeyOfPrescription extends keyof PrescriptionRowFragment
>(
  keys: KeyOfPrescription | KeyOfPrescription[]
): FieldSelectorControl<PrescriptionRowFragment, KeyOfPrescription> => {
  const prescriptionNumber = usePrescriptionNumber();
  const { data } = usePrescription();
  const api = usePrescriptionApi();
  const queryKey = api.keys.detail(prescriptionNumber);

  return useFieldsSelector(
    queryKey,
    () => api.get.byNumber(prescriptionNumber),
    (patch: Partial<PrescriptionRowFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
