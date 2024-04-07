import { Sdk } from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
};

export const getTemperatureNotificationQueries = (
  sdk: Sdk,
  storeId: string
) => ({
  get: {
    list:
      ({ first, offset }: ListParams) =>
      async () => {
        const result = await sdk.temperatureNotifications({
          storeId,
          page: { offset, first },
        });

        return result?.temperatureNotifications;
      },
  },
});
