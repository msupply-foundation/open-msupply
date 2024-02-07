import { SortBy, CurrencySortFieldInput } from '@openmsupply-client/common';
import { Sdk, CurrencyRowFragment } from './operations.generated';

export type ListParams = {
  recordId: string;
  sortBy?: SortBy<CurrencyRowFragment>;
};

export const getCurrencyQueries = (sdk: Sdk) => ({
  get: {
    list: async () => {
      const response = await sdk.currencies({
        sort: {
          key: CurrencySortFieldInput.IsHomeCurrency,
          desc: true,
        },
        filter: {},
      });
      return response?.currencies;
    },
  },
});
