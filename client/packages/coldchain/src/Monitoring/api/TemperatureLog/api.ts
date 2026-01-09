import { FilterBy, SortBy } from '@common/hooks';
import { Sdk, TemperatureLogFragment } from './operations.generated';
import { EqualFilterTemperatureBreachRowTypeInput, TemperatureLogSortFieldInput } from '@common/types';

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

        // to make query compatible with breach tab filters we move the type filter into temperatureBreach.type
        const { type: typeFilterBy, ...noTypeFilterBy } = filterBy || {};

        const result = await sdk.temperatureLogs({
          storeId,
          page: { offset, first },
          sort: {
            key,
            desc: !!sortBy.isDesc,
          },
          filter: {
            ...noTypeFilterBy,
            temperatureBreach: {
              type: typeFilterBy as EqualFilterTemperatureBreachRowTypeInput ?? null,
            },
          },
        });

        return result?.temperatureLogs;
      },
  },
});
