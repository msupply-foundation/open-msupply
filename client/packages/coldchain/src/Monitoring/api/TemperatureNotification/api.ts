import { SortBy } from '@common/hooks';
import { Sdk, TemperatureNotificationFragment } from './operations.generated';
import {
  TemperatureNotificationFilterInput,
  TemperatureNotificationSortFieldInput,
} from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureNotificationFragment>;
  filterBy: TemperatureNotificationFilterInput | null;
};

export const getTemperatureNotificationQueries = (
  sdk: Sdk,
  storeId: string
) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const result = await sdk.temperatureNotifications({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as TemperatureNotificationSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });

        return result?.temperatureNotifications;
      },
  },
});
