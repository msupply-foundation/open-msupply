import {
  FilterByWithBoolean,
  LIST,
  SortBy,
  TemperatureLogSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { TemperatureLogFragment } from '../operations.generated';
import { useTemperatureLogGraphQL } from '../useTemperatureLogGraphQL';
import { TEMPERATURE_LOG } from './keys';

interface ListParams {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureLogFragment>;
  filterBy: FilterByWithBoolean | null;
}

export const useTemperatureLogList = (queryParams: ListParams) => {
  const { temperatureLogApi, storeId } = useTemperatureLogGraphQL();
  const queryKey = [TEMPERATURE_LOG, storeId, LIST, queryParams];

  const queryFn = async () => {
    const { first, offset, sortBy, filterBy } = queryParams;
    const key =
      sortBy.key === 'endDatetime'
        ? TemperatureLogSortFieldInput.Datetime
        : (sortBy.key as TemperatureLogSortFieldInput);

    const result = await temperatureLogApi.temperatureLogs({
      storeId,
      page: { offset, first },
      sort: {
        key,
        desc: !!sortBy.isDesc,
      },
      filter: filterBy,
    });

    return result?.temperatureLogs;
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
