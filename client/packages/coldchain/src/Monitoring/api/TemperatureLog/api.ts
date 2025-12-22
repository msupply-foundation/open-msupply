import { FilterBy, SortBy } from '@common/hooks';
import { Sdk, TemperatureLogFragment } from './operations.generated';
import { TemperatureLogSortFieldInput } from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureLogFragment>;
  filterBy: FilterBy | null;
};

export const getTemperatureLogQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const key =
          sortBy.key === 'endDatetime' || sortBy.key === ''
            ? TemperatureLogSortFieldInput.Datetime
            : (sortBy.key as TemperatureLogSortFieldInput);

        const result = await sdk.temperatureLogs({
          storeId,
          page: { offset, first },
          sort: {
            key,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });

        return result?.temperatureLogs;
      },
  },
});
