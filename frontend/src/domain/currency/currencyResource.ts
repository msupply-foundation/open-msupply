import { graphqlFetch } from '../../api/graphql';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';
import {
  ActiveCurrencies,
  type ActiveCurrenciesResult,
} from './currency.generated';

export type Currency = Extract<
  ActiveCurrenciesResult['currencies'],
  { __typename: 'CurrencyConnector' }
>['nodes'][number];

// App-wide active-currencies cache: lazy, deduped, read via `.noSuspense()`.
// Keyed on the store like every other lookup so the cache primitive is the
// shared one, although the list itself carries no store argument.
export const currenciesResource = createStoreScopedResource<Currency>(
  currentStoreId,
  async () => {
    const result = await graphqlFetch(ActiveCurrencies, {});
    if (result.kind !== 'success') return undefined;
    return result.data.currencies.__typename === 'CurrencyConnector'
      ? result.data.currencies.nodes
      : undefined;
  }
);
