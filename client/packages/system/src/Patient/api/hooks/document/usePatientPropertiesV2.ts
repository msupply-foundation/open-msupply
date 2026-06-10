import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

/** Fetch the patient-scoped propertyV2 definitions (the custom fields a patient
 * has, with their value types and options). Cached globally — the definition
 * set is not patient-specific. */
export const usePatientPropertiesV2 = () => {
  const api = usePatientApi();
  return useQuery({
    queryKey: api.keys.propertiesV2(),
    queryFn: () => api.get.propertiesV2(),
  });
};
