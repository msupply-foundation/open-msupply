import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemApi';

export const useLocationTypes = () => {
  const { api, storeId } = useItemGraphQL();

  const locationTypesKey = 'locationTypes';

  return useQuery(locationTypesKey, () => api.locationTypes({ storeId }));
};
