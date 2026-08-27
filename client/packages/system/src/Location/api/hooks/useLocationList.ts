import { LocationRowFragment } from '../operations.generated';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';
import {
  SortBy,
  useQuery,
  keepPreviousData,
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
  currentLocation?: LocationRowFragment | null,
  enabled: boolean = true
) => {
  const { data, isLoading, isError, isFetching } = useGetList(
    enabled,
    queryParams
  );

  // NEXT LOCATION
  const next = getNextLocation(data?.nodes ?? [], currentLocation);

  return {
    query: { data, isLoading, isError, isFetching },
    nextLocation: next,
    hasNext: next !== null,
  };
};

const useGetList = (enabled?: boolean, queryParams?: ListParams) => {
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
      // Stopgap for large warehouses until location search is server-side,
      // see https://github.com/msupply-foundation/open-msupply/issues/12500
      first: first ?? 5000,
      offset: offset ?? 0,
      sort: toSortInput(sortBy),
      filter: filterBy,
      storeId,
    });
    const { nodes, totalCount } = query?.locations;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey: [...queryKey, enabled],
    queryFn,
    enabled,
    placeholderData: keepPreviousData,
  });
  return query;
};

const getNextLocation = (
  data: LocationRowFragment[],
  currentLocation?: LocationRowFragment | null
) => {
  const idx = data.findIndex(l => l.id === currentLocation?.id);
  if (idx === -1) return null;
  return data[idx + 1] ?? null;
};

const toSortInput = (sortBy?: SortBy<LocationRowFragment>) =>
  sortBy?.key
    ? {
        desc: sortBy?.isDesc,
        key: sortBy?.key as LocationSortFieldInput,
      }
    : undefined;
