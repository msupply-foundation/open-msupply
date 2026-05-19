import { PropertyParentTableEnum, useQuery } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES_FOR_TABLE } from './keys';

export const usePropertiesForTable = (table: PropertyParentTableEnum) => {
  const { propertyApi } = usePropertyGraphQL();

  return useQuery({
    queryKey: [PROPERTIES_FOR_TABLE, table],
    queryFn: async () => {
      const result = await propertyApi.propertiesForTable({ table });
      return result.propertiesForTable;
    },
  });
};
