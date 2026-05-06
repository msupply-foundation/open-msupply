import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemApi';

export const useLocationTypes = () => {
  const { api, storeId } = useItemGraphQL();

  const locationTypesKey = 'locationTypes';

  return useQuery({
    queryKey: [locationTypesKey],
    queryFn: () => api.locationTypes({ storeId })
  });
};
