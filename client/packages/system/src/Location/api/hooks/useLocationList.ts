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

export type ListParams = {
  sortBy: SortBy<LocationRowFragment>;
  first?: number;
  offset?: number;
  filterBy?: LocationFilterInput | null;
};

export const useLocationList = (queryParams?: ListParams) => {
  const { data, isLoading, isError } = useGetList(queryParams);

  return {
    query: { data, isLoading, isError },
  };
};

export const useGetList = (queryParams?: ListParams) => {
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

const toSortInput = (sortBy?: SortBy<LocationRowFragment>) => ({
  desc: sortBy?.isDesc,
  key: sortBy?.key as LocationSortFieldInput,
});
