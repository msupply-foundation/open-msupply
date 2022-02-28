import { useQueryClient, useMutation } from 'react-query';
import {
  useOmSupplyApi,
  useAuthState,
  useQueryParams,
  useQuery,
} from '@openmsupply-client/common';
import { getLocationQueries } from './api';
import { getSdk, LocationRowFragment } from './operations.generated';

export const useLocationApi = () => {
  const { storeId } = useAuthState();
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const queries = getLocationQueries(sdk, storeId);
  return { ...queries, storeId };
};

export const useLocationInsert = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.insert(location),

    {
      onSettled: () => queryClient.invalidateQueries(['location']),
    }
  );
};

export const useLocationUpdate = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.update(location),

    {
      onSettled: () => queryClient.invalidateQueries(['location']),
    }
  );
};

export const useLocationDelete = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();

  return useMutation(
    async (location: LocationRowFragment) => api.delete(location),
    {
      onSettled: () => queryClient.invalidateQueries(['location']),
    }
  );
};

export const useLocations = () => {
  const api = useLocationApi();
  const queryParams = useQueryParams<LocationRowFragment>({
    initialSortBy: { key: 'name' },
  });

  const result = useQuery(['location', 'list', api.storeId, queryParams], () =>
    api.get.list(queryParams)
  );

  return { ...queryParams, ...result };
};

export const useNextLocation = (
  currentLocation: LocationRowFragment | null
): LocationRowFragment | null => {
  const { data } = useLocations();
  const idx = data?.nodes.findIndex(l => l.id === currentLocation?.id);
  if (idx == undefined) return null;
  const next = data?.nodes[(idx + 1) % data?.nodes.length];

  return next ?? null;
};
