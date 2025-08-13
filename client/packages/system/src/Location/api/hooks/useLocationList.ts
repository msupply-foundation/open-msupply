import { LocationRowFragment } from '../operations.generated';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';
import {
  SortBy,
  useQuery,
  LIST_KEY,
  LocationFilterInput,
  LocationSortFieldInput,
} from '@openmsupply-client/common';

type ListParams = {
  sortBy: SortBy<LocationRowFragment>;
  first?: number;
  offset?: number;
  filterBy?: LocationFilterInput | null;
};

export const useLocationList = (
  queryParams?: ListParams,
  currentLocation?: LocationRowFragment | null
) => {
  const { data, isLoading, isError } = useGetList(queryParams);

  // NEXT LOCATION
  const next = getNextLocation(data?.nodes ?? [], currentLocation);

  return {
    query: { data, isLoading, isError },
    nextLocation: next,
  };
};

const useGetList = (queryParams?: ListParams) => {
  const { locationApi, storeId } = useLocationGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [
    LOCATION,
    storeId,
    LIST_KEY,
    first,
    offset,
    sortBy,
    filterBy,
  ];

  const queryFn = async () => {
    const query = await locationApi.locations({
      first: first ?? 1000,
      offset: offset ?? 0,
      sort: toSortInput(sortBy),
      filter: filterBy,
      storeId,
    });
    const { nodes, totalCount } = query?.locations;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};

const getNextLocation = (
  data: LocationRowFragment[],
  currentLocation?: LocationRowFragment | null
) => {
  const idx = data?.findIndex(l => l.id === currentLocation?.id);
  if (idx == undefined) return null;
  const next = data[(idx + 1) % data.length];

  return next ?? null;
};

const toSortInput = (sortBy?: SortBy<LocationRowFragment>) => ({
  desc: sortBy?.isDesc,
  key: sortBy?.key as LocationSortFieldInput,
});
