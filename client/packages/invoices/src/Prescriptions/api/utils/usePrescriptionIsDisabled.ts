import { isPrescriptionDisabled } from '../../../utils';
import { usePrescription } from '../hooks/document/usePrescription';

export const usePrescriptionIsDisabled = (): boolean => {
  const { data } = usePrescription();
  if (!data) return true;
  return isPrescriptionDisabled(data);
};
