import {
  LocationSortFieldInput,
  SortBy,
  useQuery,
  LIST_KEY,
} from '@openmsupply-client/common';
import { LocationRowFragment } from '../operations.generated';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';

export const useExportLocationList = (sortBy: SortBy<LocationRowFragment>) => {
  const { locationApi, storeId } = useLocationGraphQL();

  const queryKey = [LOCATION, storeId, LIST_KEY, 'export', sortBy];
  const queryFn = async (): Promise<{
    nodes: LocationRowFragment[];
    totalCount: number;
  }> => {
    const result = await locationApi.locations({
      sort: sortBy?.key
        ? {
            key: sortBy.key as LocationSortFieldInput,
            desc: sortBy.isDesc,
          }
        : { key: LocationSortFieldInput.Name, desc: false },
      storeId,
    });
    return result?.locations;
  };

  const { data, refetch, isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled: false,
  });

  return { data, fetchLocations: refetch, isLoading };
};
