import { useQueryClient, useMutation } from 'react-query';
import {
  useGql,
  useAuthContext,
  useQueryParams,
  useQuery,
  SortBy,
} from '@openmsupply-client/common';
import { getLocationQueries, ListParams } from './api';
import { getSdk, LocationRowFragment } from './operations.generated';

export const useLocationApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['location'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<LocationRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getLocationQueries(sdk, storeId);
  return { ...queries, storeId, keys };
};

export const useLocationInsert = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.insert(location),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    }
  );
};

export const useLocationUpdate = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.update(location),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    }
  );
};

export const useLocationDelete = () => {
  const queryClient = useQueryClient();
  const api = useLocationApi();
  return useMutation(
    async (location: LocationRowFragment) => api.delete(location),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    }
  );
};

export const useLocations = () => {
  const api = useLocationApi();
  const queryParams = useQueryParams<LocationRowFragment>({
    initialSortBy: { key: 'name' },
  });

  const result = useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );

  return { ...queryParams, ...result };
};

export const useLocationsAll = (sortBy: SortBy<LocationRowFragment>) => {
  const api = useLocationApi();
  const result = useMutation(api.keys.sortedList(sortBy), () =>
    api.get.list({ sortBy })
  );

  return { ...result };
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
