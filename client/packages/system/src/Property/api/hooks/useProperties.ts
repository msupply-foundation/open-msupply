import { useQuery } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES } from './keys';

export const useProperties = (enabled = true) => {
  const { propertyApi } = usePropertyGraphQL();

  return useQuery({
    queryKey: [PROPERTIES],
    queryFn: async () => {
      const result = await propertyApi.propertiesV2();
      return result.propertiesV2;
    },
    enabled,
  });
};
