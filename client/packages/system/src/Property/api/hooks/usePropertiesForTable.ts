import { PropertyV2ParentTableEnum, useQuery } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES_FOR_TABLE } from './keys';

export const usePropertiesForTable = (table: PropertyV2ParentTableEnum) => {
  const { propertyApi } = usePropertyGraphQL();

  return useQuery({
    queryKey: [PROPERTIES_FOR_TABLE, table],
    queryFn: async () => {
      const result = await propertyApi.propertiesV2ForTable({ table });
      return result.propertiesV2ForTable;
    },
  });
};
