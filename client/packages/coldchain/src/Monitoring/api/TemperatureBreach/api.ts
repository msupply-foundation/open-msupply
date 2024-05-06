import { SortBy } from '@common/hooks';
import { Sdk, TemperatureBreachFragment } from './operations.generated';
import {
  DatetimeFilterInput,
  InputMaybe,
  RecordPatch,
  TemperatureBreachFilterInput,
  TemperatureBreachSortFieldInput,
} from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureBreachFragment>;
  filterBy:
    | TemperatureBreachFilterInput
    | null
    | Partial<TemperatureBreachFilterInput & datetimeQueryParams>
    | any;
};

type datetimeQueryParams = {
  datetime?: InputMaybe<DatetimeFilterInput>;
};

type dualDatetimeQueryParams = {
  endDatetime?: InputMaybe<DatetimeFilterInput> | undefined;
  startDatetime?: InputMaybe<DatetimeFilterInput> | undefined;
};

export const getTemperatureBreachQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        // renaming query params to matchin temperature breach query which includes a start and end date filter
        // this will filter so that any filters beginning before the filter end date and/or starting after the
        // start date will be included
        const startDatetime: dualDatetimeQueryParams =
          filterBy?.['datetime']?.['afterOrEqualTo'];
        const endDatetime: DatetimeFilterInput | undefined =
          filterBy?.['datetime']?.['beforeOrEqualTo'];

        let filterByWithTwoDates:
          | Partial<
              | (TemperatureBreachFilterInput & dualDatetimeQueryParams)
              | datetimeQueryParams
            >
          | null
          | any = startDatetime
          ? {
              endDatetime: { afterOrEqualTo: startDatetime },
              ...filterBy,
            }
          : filterBy;
        filterByWithTwoDates = endDatetime
          ? {
              startDatetime: { beforeOrEqualTo: endDatetime },
              ...filterByWithTwoDates,
            }
          : filterByWithTwoDates;
        if (filterByWithTwoDates) {
          delete filterByWithTwoDates['datetime'];
        }
        const filterByInput =
          filterByWithTwoDates as TemperatureBreachFilterInput;
        const result = await sdk.temperature_breaches({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as TemperatureBreachSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterByInput,
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
