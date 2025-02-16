import { useParams } from '@openmsupply-client/common';

export const usePrescriptionId = () => {
  const { prescriptionId: prescriptionId = '' } = useParams();
  return prescriptionId;
};
