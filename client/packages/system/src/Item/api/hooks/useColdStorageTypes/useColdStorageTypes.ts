import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemApi';

export const useColdStorageTypes = () => {
  const { api, storeId } = useItemGraphQL();

  const coldStorageTypesKey = 'coldStorageTypes';

  return useQuery(coldStorageTypesKey, () => api.coldStorageTypes({ storeId }));
};
