import { FilterBy, SortBy } from '@common/hooks';
import { Sdk, TemperatureLogFragment } from './operations.generated';
import {
  EqualFilterTemperatureBreachRowTypeInput,
  InputMaybe,
  TemperatureLogFilterInput,
  TemperatureLogSortFieldInput,
} from '@common/types';
import { isEnumValue } from '@common/utils';

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
        const key = isEnumValue(TemperatureLogSortFieldInput, sortBy.key)
          ? sortBy.key
          : TemperatureLogSortFieldInput.Datetime;

        // to make query compatible with breach tab filters we move the type filter into temperatureBreach.type
        const { type: typeFilterBy, ...noTypeFilterBy } = filterBy || {};

        let filter: InputMaybe<TemperatureLogFilterInput> = {
          ...noTypeFilterBy,
        };

        if (typeFilterBy) {
          filter = {
            ...filter,
            temperatureBreach: {
              type: typeFilterBy as EqualFilterTemperatureBreachRowTypeInput,
            },
          };
        }

        const result = await sdk.temperatureLogs({
          storeId,
          page: { offset, first },
          sort: {
            key,
            desc: !!sortBy.isDesc,
          },
          filter,
        });

        return result?.temperatureLogs;
      },
  },
});
