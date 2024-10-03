import {
  FieldSelectorControl,
  useFieldsSelector,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionNumber } from '../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';
import { usePrescription } from './usePrescription';

export const usePrescriptionFields = <
  KeyOfPrescription extends keyof PrescriptionRowFragment,
>(
  keys: KeyOfPrescription | KeyOfPrescription[]
): FieldSelectorControl<PrescriptionRowFragment, KeyOfPrescription> => {
  const prescriptionNumber = usePrescriptionNumber();
  const { data } = usePrescription();
  const api = usePrescriptionApi();
  const queryKey = api.keys.detail(prescriptionNumber);
  const { error: e } = useNotification();
  const t = useTranslation();

  const updateAndCaptureError: typeof api.update = async input => {
    const result = await api.update(input);
    const errors =
      result?.updatePrescriptions?.flatMap(({ response }) => {
        if ('error' in response) return [response.error];
        return [];
      }) || [];

    for (const error of errors) {
      if (error.__typename == 'InvalidStockSelection') {
        e(t('error.cannot-backdate-prescription'))();
        break;
      }
    }

    return result;
  };

  return useFieldsSelector(
    queryKey,
    () => api.get.byNumber(prescriptionNumber),
    (patch: Partial<PrescriptionRowFragment>) =>
      updateAndCaptureError({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
