import { LocationFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLocations = ({
  filter,
}: {
  filter?: LocationFilterInput;
}) => {
  const api = useAssetApi();

  return useQuery(api.keys.locations(filter), () => api.get.locations(filter));
};
