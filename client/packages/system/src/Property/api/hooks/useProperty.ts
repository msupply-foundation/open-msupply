import { useQuery } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES } from './keys';

export const useProperty = (id: string | undefined) => {
  const { propertyApi } = usePropertyGraphQL();

  return useQuery({
    queryKey: [PROPERTIES, id],
    queryFn: async () => {
      if (!id || id === 'new') return null;
      const result = await propertyApi.propertyV2ById({ id });
      return result.propertyV2ById ?? null;
    },
    enabled: id !== undefined,
  });
};
