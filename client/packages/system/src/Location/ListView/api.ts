import { useQueryClient } from 'react-query';
import {
  UseMutationResult,
  useMutation,
  useQueryParams,
  useQuery,
  useOmSupplyApi,
  UseQueryResult,
  LocationsQuery,
  QueryParamsState,
  SortBy,
  LocationSortInput,
  LocationSortFieldInput,
} from '@openmsupply-client/common';
import { Location } from '../types';

const toSortInput = (sortBy: SortBy<Location>): LocationSortInput => {
  return { desc: sortBy.isDesc, key: sortBy.key as LocationSortFieldInput };
};

const locationsGuard = (locationsQuery: LocationsQuery) => {
  if (locationsQuery.locations.__typename === 'LocationConnector') {
    return locationsQuery.locations;
  }

  throw new Error(locationsQuery.locations.error.description);
};

export const useLocationInsert = (): UseMutationResult<
  unknown,
  unknown,
  Location,
  unknown
> => {
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  return useMutation(
    async (location: Location) => {
      api.insertLocation({ input: location });
    },
    {
      onSettled: () => queryClient.invalidateQueries(['location', 'list']),
    }
  );
};

export const useLocationUpdate = (): UseMutationResult<
  unknown,
  unknown,
  Location,
  unknown
> => {
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  return useMutation(
    async (location: Location) => {
      api.updateLocation({ input: location });
    },
    {
      onSettled: () => queryClient.invalidateQueries(['location', 'list']),
    }
  );
};

export const useLocationList = (): UseQueryResult<
  { nodes: Location[]; totalCount: number },
  unknown
> &
  QueryParamsState<Location> => {
  const { api } = useOmSupplyApi();

  const queryParams = useQueryParams<Location>({
    initialSortBy: { key: 'name' },
  });

  const result = useQuery(['location', 'list', queryParams], async () => {
    const response = await api.locations({
      sort: [toSortInput(queryParams.sortBy)],
    });
    const locations = locationsGuard(response);
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
