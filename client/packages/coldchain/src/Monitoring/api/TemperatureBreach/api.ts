import { SortBy } from '@common/hooks';
import { Sdk, TemperatureBreachFragment } from './operations.generated';
import {
  DatetimeFilterInput,
  RecordPatch,
  TemperatureBreachFilterInput,
  TemperatureBreachSortFieldInput,
} from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureBreachFragment>;
  filterBy:
    | (TemperatureBreachFilterInput & { datetime?: DatetimeFilterInput })
    | null;
};

export const getTemperatureBreachQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const key =
          sortBy.key === 'datetime' || sortBy.key === 'temperature'
            ? TemperatureBreachSortFieldInput.StartDatetime
            : (sortBy.key as TemperatureBreachSortFieldInput);

        let filter = undefined;
        if (filterBy !== null) {
          const { datetime, ...rest } = filterBy;
          if (!!datetime) {
            filter = {
              ...rest,
              startDatetime: datetime,
            };
          }
        }

        const result = await sdk.temperature_breaches({
          storeId,
          page: { offset, first },
          sort: {
            key,
            desc: !!sortBy.isDesc,
          },
          filter,
        });

        return result?.temperatureBreaches;
      },
  },
  update: async (patch: RecordPatch<TemperatureBreachFragment>) => {
    const input = {
      comment: patch.comment,
      id: patch.id,
      unacknowledged: patch.unacknowledged || false,
    };
    const result =
      (await sdk.updateTemperatureBreach({ input, storeId })) || {};

    return result.updateTemperatureBreach;
  },
});
