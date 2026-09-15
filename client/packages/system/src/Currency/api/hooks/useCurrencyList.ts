import {
  CurrencySortFieldInput,
  LIST_KEY,
  useQuery,
} from '@openmsupply-client/common';
import { CurrencyRowFragment } from '../operations.generated';
import { CURRENCY } from './keys';
import { useCurrencyGraphQL } from '../useCurrencyGraphQL';

export function useCurrencyList() {
  const { currencyApi } = useCurrencyGraphQL();

  const queryKey = [CURRENCY, LIST_KEY];
  const queryFn = async (): Promise<{
    nodes: CurrencyRowFragment[];
    totalCount: number;
  }> => {
    const query = await currencyApi.currencies({
      sort: {
        key: CurrencySortFieldInput.IsHomeCurrency,
        desc: true,
      },
      filter: {},
    });
    const { nodes, totalCount } = query?.currencies;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}
