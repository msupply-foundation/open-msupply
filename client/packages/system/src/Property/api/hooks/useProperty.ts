import { useQuery } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES } from './keys';

export const useProperty = (id: string | undefined) => {
  const { propertyApi } = usePropertyGraphQL();

  return useQuery({
    queryKey: [PROPERTIES, id],
    queryFn: async () => {
      if (!id || id === 'new') return null;
      const result = await propertyApi.propertyById({ id });
      return result.propertyById ?? null;
    },
    enabled: id !== undefined,
  });
};
