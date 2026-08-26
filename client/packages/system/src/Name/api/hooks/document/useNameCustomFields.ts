import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

/**
 * Fetch the custom-field definitions for a name scope. Names have no single
 * scope: `scope` is `"customer"` or `"supplier"` (the list/detail view decides
 * which), matching the per-role scopes seeded by `central_mapping_custom_fields`
 * and resolved by `NameNode.customFields`.
 */
export const useNameCustomFields = (scope: string) => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.customFields(scope),
    queryFn: () => api.get.customFields(scope),
  });
};
