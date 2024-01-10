import { SortBy } from '@common/hooks';
import { Sdk, TemperatureBreachFragment } from './operations.generated';
import {
  RecordPatch,
  TemperatureBreachFilterInput,
  TemperatureBreachSortFieldInput,
  UpdateTemperatureBreachInput,
} from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureBreachFragment>;
  filterBy: TemperatureBreachFilterInput | null;
};

const temperatureBreachParser = {
  toUpdate: (
    patch: RecordPatch<TemperatureBreachFragment>
  ): UpdateTemperatureBreachInput => ({
    comment: patch.comment,
    id: patch.id,
    unacknowledged: patch.unacknowledged || false,
  }),
};

export const getTemperatureBreachQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const result = await sdk.temperature_breaches({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as TemperatureBreachSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });

        return result?.temperatureBreaches;
      },
  },
  update: async (patch: RecordPatch<TemperatureBreachFragment>) => {
    const input = temperatureBreachParser.toUpdate(patch);
    const result =
      (await sdk.updateTemperatureBreach({ input, storeId })) || {};

    return result.updateTemperatureBreach;
  },
});
