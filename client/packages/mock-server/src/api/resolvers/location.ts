import { createListResponse } from './utils';
import { StockLineConnector } from '@openmsupply-client/common/src/types';
import { ListResponse, ResolvedLocation } from './../../data/types';
import { db } from './../../data/database';

export const locationResolver = {
  byId: (id: string): ResolvedLocation => {
    const location = db.location.get.byId(id);
    const stock: StockLineConnector = {
      __typename: 'StockLineConnector',
      nodes: [],
      totalCount: 0,
    };

    return { ...location, stock, __typename: 'LocationNode' };
  },
  list: (): ListResponse<ResolvedLocation, 'LocationConnector'> => {
    const locations = db.location.get.all();
    const resolved = locations.map(location =>
      locationResolver.byId(location.id)
    );

    const nodes = resolved.map(location => locationResolver.byId(location.id));

    return createListResponse(nodes.length, nodes, 'LocationConnector');
  },
};
