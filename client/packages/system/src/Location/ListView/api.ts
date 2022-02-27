import { useQueryClient } from 'react-query';
import {
  UpdateLocationInput,
  InsertLocationInput,
  UseMutationResult,
  useMutation,
  useQueryParams,
  useQuery,
  useOmSupplyApi,
  UseQueryResult,
  QueryParamsState,
  SortBy,
  LocationSortInput,
  LocationSortFieldInput,
  DeleteLocationMutation,
  useAuthState,
} from '@openmsupply-client/common';
import { Location } from '../types';

const toSortInput = (sortBy: SortBy<Location>): LocationSortInput => {
  return { desc: sortBy.isDesc, key: sortBy.key as LocationSortFieldInput };
};

const toInsertInput = (location: Location): InsertLocationInput => ({
  id: location?.id,
  name: location?.name,
  code: location?.code,
  onHold: location?.onHold,
});

export const useLocationInsert = (): UseMutationResult<
  unknown,
  unknown,
  Location,
  unknown
> => {
  const queryClient = useQueryClient();
  const { storeId } = useAuthState();
  const { api } = useOmSupplyApi();
  return useMutation(
    async (location: Location) => {
      api.insertLocation({ input: toInsertInput(location), storeId });
    },
    {
      onSettled: () => queryClient.invalidateQueries(['location', 'list']),
    }
  );
};

const toUpdateInput = (location: Location): UpdateLocationInput => ({
  id: location?.id,
  name: location?.name,
  code: location?.code,
  onHold: location?.onHold,
});

export const useLocationUpdate = (): UseMutationResult<
  unknown,
  unknown,
  Location,
  unknown
> => {
  const queryClient = useQueryClient();
  const { storeId } = useAuthState();
  const { api } = useOmSupplyApi();
  return useMutation(
    async (location: Location) => {
      api.updateLocation({ input: toUpdateInput(location), storeId });
    },
    {
      onSettled: () => queryClient.invalidateQueries(['location', 'list']),
    }
  );
};

export const useLocationDelete = (): UseMutationResult<
  DeleteLocationMutation,
  unknown,
  Location,
  unknown
> => {
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  const { storeId } = useAuthState();
  return useMutation(
    async (location: Location) =>
      api.deleteLocation({ input: { id: location.id }, storeId: storeId }),
    {
      onSettled: () => queryClient.invalidateQueries(['location']),
    }
  );
};

export const useLocationList = (): UseQueryResult<
  { nodes: Location[]; totalCount: number },
  unknown
> &
  QueryParamsState<Location> => {
  const { api } = useOmSupplyApi();
  const { storeId } = useAuthState();
  const queryParams = useQueryParams<Location>({
    initialSortBy: { key: 'name' },
  });

  const result = useQuery(['location', 'list', queryParams], async () => {
    const response = await api.locations({
      sort: [toSortInput(queryParams.sortBy)],
      storeId,
    });
    const locations = response.locations;
    return locations;
  });

  return { ...queryParams, ...result };
};

export const useNextLocation = (
  currentLocation: Location | null
): Location | null => {
  const { data } = useLocationList();

  const idx = data?.nodes.findIndex(l => l.id === currentLocation?.id);

  if (idx == undefined) return null;

  const next = data?.nodes[(idx + 1) % data?.nodes.length];

  return next ?? null;
};
