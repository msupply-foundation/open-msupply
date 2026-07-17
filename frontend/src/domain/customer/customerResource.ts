import { graphqlFetch } from '../../api/graphql';
import { Customers, type CustomersResult } from './customer.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One customer node. `store` is set when the customer is itself another store —
// a shipment to it is a transfer (spec/outbound-shipments rules § transfers).
export type Customer = Extract<
  CustomersResult['names'],
  { __typename: 'NameConnector' }
>['nodes'][number];

// App-wide customers cache — same shape/rationale as locationsResource:
// store-scoped, lazy, deduped, module-scope singleton, read via
// `.noSuspense()`.
export const customersResource = createStoreScopedResource<Customer>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(Customers, { storeId });
    if (result.kind !== 'success') return undefined;
    return result.data.names.__typename === 'NameConnector'
      ? result.data.names.nodes
      : undefined;
  }
);
