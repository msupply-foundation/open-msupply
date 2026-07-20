import { graphqlFetch } from '../../api/graphql';
import {
  ShippingMethods,
  type ShippingMethodsResult,
} from './shippingMethod.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

export type ShippingMethod = Extract<
  ShippingMethodsResult['shippingMethods'],
  { __typename: 'ShippingMethodConnector' }
>['nodes'][number];

// App-wide shipping-methods cache — store-scoped, lazy, deduped (see
// storeScopedResource).
export const shippingMethodsResource =
  createStoreScopedResource<ShippingMethod>(currentStoreId, async storeId => {
    const result = await graphqlFetch(ShippingMethods, { storeId });
    if (result.kind !== 'success') return undefined;
    return result.data.shippingMethods.__typename === 'ShippingMethodConnector'
      ? result.data.shippingMethods.nodes
      : undefined;
  });
