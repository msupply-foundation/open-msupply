import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

/** Fetch the patient-scoped customField definitions (the custom fields a patient
 * has, with their value types and options). Cached globally — the definition
 * set is not patient-specific. */
export const usePatientCustomFields = () => {
  const api = usePatientApi();
  return useQuery({
    queryKey: api.keys.customFields(),
    queryFn: () => api.get.customFields(),
  });
};
