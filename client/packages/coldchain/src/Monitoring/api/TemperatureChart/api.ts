import { Sdk } from './operations.generated';
import { TemperatureLogFilterInput } from '@common/types';

export type ListParams = {
  filterBy: TemperatureLogFilterInput | null;
  numberOfDataPoints: number;
  fromDatetime: string;
  toDatetime: string;
};

export const getTemperatureChartQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    chart:
      ({
        filterBy,
        fromDatetime,
        numberOfDataPoints,
        toDatetime,
      }: ListParams) =>
      async () => {
        const result = await sdk.temperatureChart({
          filter: filterBy,
          fromDatetime,
          numberOfDataPoints,
          storeId,
          toDatetime,
        });

        return result?.temperatureChart ?? [];
      },
  },
});
