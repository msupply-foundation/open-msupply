import { graphqlFetch } from '../../../../api/graphql';
import {
  OutboundItemOptions,
  type OutboundItemOptionsResult,
} from './outboundLineEdit.generated';
import { createStoreScopedResource } from '../../../../api/storeScopedResource';
import { currentStoreId } from '../../../../store/storeContext';

// One stock-item option for the S4 item picker.
export type ItemOption = Extract<
  OutboundItemOptionsResult['items'],
  { __typename: 'ItemConnector' }
>['nodes'][number];

// The store's stock-item catalogue for the picker — store-scoped, lazy,
// deduped; the Combobox filters it client-side (the registry's
// build-on-Combobox item-catalogue lookup).
export const itemOptionsResource = createStoreScopedResource<ItemOption>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(OutboundItemOptions, { storeId });
    if (result.kind !== 'success') return undefined;
    return result.data.items.__typename === 'ItemConnector'
      ? result.data.items.nodes
      : undefined;
  }
);
