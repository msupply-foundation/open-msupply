import { useQuery } from '@openmsupply-client/common';
import { FilterByWithBoolean, SortBy } from '@common/hooks';

import { SENSOR } from './keys';
import { SensorFragment } from '../operations.generated';
import { useSensorGraphQL } from '../useSensorGraphQL';
import { SensorSortFieldInput } from '@common/types';

export interface ListParams {
  first: number;
  offset: number;
  sortBy: SortBy<SensorFragment>;
  filterBy: FilterByWithBoolean | null;
}

export const useSensorList = (queryParams?: ListParams) => {
  const { sensorApi, storeId } = useSensorGraphQL();
  const queryKey = [SENSOR, storeId, queryParams];

  const queryFn = async () => {
    const { first, offset, sortBy, filterBy } = queryParams ?? {};

    const query = await sensorApi.sensors({
      storeId,
      page: { offset, first },
      sort: {
        key: sortBy?.key as SensorSortFieldInput,
        desc: !!sortBy?.isDesc,
      },
      filter: filterBy,
    });

    const { nodes, totalCount } = query?.sensors;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });

  return query;
};
