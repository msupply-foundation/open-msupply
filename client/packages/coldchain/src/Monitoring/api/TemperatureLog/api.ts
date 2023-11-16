import { FilterByWithBoolean, SortBy } from '@common/hooks';
import { Sdk, TemperatureLogFragment } from './operations.generated';
import { TemperatureLogSortFieldInput } from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureLogFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const getTemperatureLogQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const result = await sdk.temperature_logs({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as TemperatureLogSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });

        return result?.temperatureLogs;
      },
  },
});
