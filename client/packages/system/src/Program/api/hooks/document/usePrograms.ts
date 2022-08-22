import { useQuery } from '@openmsupply-client/common';
import { usePatient } from '../../../../Patient';
import { useProgramApi } from '../utils/useProgramApi';

export const usePrograms = () => {
  const api = useProgramApi();
  const patientId = usePatient.utils.id();
  const params = {
    filterBy: { patientId: { equalTo: patientId } },
  };

  return {
    ...useQuery(api.keys.paramList(params), () => api.get.list(params)),
  };
};
