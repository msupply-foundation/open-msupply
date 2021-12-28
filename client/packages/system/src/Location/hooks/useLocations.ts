import {
  useQuery,
  useOmSupplyApi,
  UseQueryResult,
  LocationsQuery,
  LocationNode,
} from '@openmsupply-client/common';

const locationsGuard = (locationsQuery: LocationsQuery) => {
  if (locationsQuery.locations.__typename === 'LocationConnector') {
    return locationsQuery.locations;
  }

  throw new Error(locationsQuery.locations.error.description);
};

export const useLocations = (): UseQueryResult<
  { nodes: LocationNode; totalCount: number },
  unknown
> => {
  const { api } = useOmSupplyApi();
  return useQuery(['locations', 'list'], async () => {
    const result = await api.locations();
    const locations = locationsGuard(result);
    return locations;
  });
};
