import { db } from './../../data/database';
import { ListResponse, ResolvedStore } from './../../data/types';
import { createListResponse } from './utils';

export const storeResolver = {
  list: (): ListResponse<ResolvedStore, 'StoreConnector'> => {
    const stores = db.get.all.store();
    const resolvedStores = stores.map(store => storeResolver.byId(store.id));

    return createListResponse(
      resolvedStores.length,
      resolvedStores,
      'StoreConnector'
    );
  },
  byId: (id: string): ResolvedStore => {
    return { __typename: 'StoreNode', ...db.get.byId.store(id) };
  },
};
