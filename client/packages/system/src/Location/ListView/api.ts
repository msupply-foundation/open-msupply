import {
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

export const useLocationList = (): UseQueryResult<
  { nodes: Location[]; totalCount: number },
  unknown
> &
  QueryParamsState<Location> => {
  const { api } = useOmSupplyApi();

  const queryParams = useQueryParams<Location>({
    initialSortBy: { key: 'name' },
  });

  const result = useQuery(['locations', 'list', queryParams], async () => {
    const result = await api.locations({
      sort: [toSortInput(queryParams.sortBy)],
    });
    const locations = locationsGuard(result);
    return locations;
  });

  return { ...queryParams, ...result };
};
