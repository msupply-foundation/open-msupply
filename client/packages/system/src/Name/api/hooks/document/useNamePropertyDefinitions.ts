import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

// Property definitions (KDD option 1) attached to the `name` table. Used by
// the names list toolbar to render a dropdown per option-typed property.
export const useNamePropertyDefinitions = () => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.propertyDefinitions(),
    queryFn: () => api.get.propertyDefinitions(),
  });
};
