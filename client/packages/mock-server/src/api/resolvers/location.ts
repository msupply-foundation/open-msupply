import { createListResponse } from './utils';
import {
  LocationSortInput,
  StockLineConnector,
} from '@openmsupply-client/common/src/types';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
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
  list: (vars: {
    sort?: LocationSortInput | LocationSortInput[] | null;
  }): ListResponse<ResolvedLocation, 'LocationConnector'> => {
    const locations = db.location.get.all();
    const resolved = locations.map(location =>
      locationResolver.byId(location.id)
    );

    const nodes = resolved.map(location => locationResolver.byId(location.id));

    const { sort = [] } = vars;

    const { key, desc = false } =
      sort && Array.isArray(sort)
        ? sort?.[0] ?? { key: 'name', desc: false }
        : sort ?? { key: 'name', desc: false };

    const sorted = nodes;
    if (key) {
      sorted.sort(getDataSorter(key, !!desc));
    }

    return createListResponse(nodes.length, nodes, 'LocationConnector');
  },
};
