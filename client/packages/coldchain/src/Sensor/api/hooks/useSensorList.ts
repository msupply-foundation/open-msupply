import { LIST_KEY, useQuery } from '@openmsupply-client/common';
import { FilterBy, SortBy } from '@common/hooks';

import { SENSOR } from './keys';
import { SensorFragment } from '../operations.generated';
import { useSensorGraphQL } from '../useSensorGraphQL';
import { SensorSortFieldInput } from '@common/types';

export interface ListParams {
  first: number;
  offset: number;
  sortBy: SortBy<SensorFragment>;
  filterBy: FilterBy | null;
}

export const useSensorList = (queryParams?: ListParams) => {
  const { sensorApi, storeId } = useSensorGraphQL();
  const queryKey = [SENSOR, storeId, LIST_KEY, queryParams];

  const queryFn = async () => {
    const { first, offset, sortBy, filterBy } = queryParams ?? {};

    const sortKey = (sortBy?.key ||
      SensorSortFieldInput.Serial) as SensorSortFieldInput;
    const result = await sensorApi.sensors({
      storeId,
      page: { offset, first },
      sort: {
        key: sortKey,
        desc: !!sortBy?.isDesc,
      },
      filter: filterBy,
    });

    if (!result.sensors) return { nodes: [], totalCount: 0 };
    const { nodes, totalCount } = result.sensors;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });

  return query;
};
