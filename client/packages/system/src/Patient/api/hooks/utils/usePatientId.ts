import { useParams } from '@openmsupply-client/common';

export const usePatientId = () => {
  const { patientId = '' } = useParams();
  return patientId;
};
