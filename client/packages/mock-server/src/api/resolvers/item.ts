import {
  ItemSortFieldInput,
  ItemsResponse,
} from '@openmsupply-client/common/src/types/schema';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
import { ResolverService } from './index';
import { getAvailableQuantity } from './old';

import { db, ResolvedItem, ItemListParameters } from '../../data';

const getItemsSortKey = (key: string) => {
  switch (key) {
    case ItemSortFieldInput.Code: {
      return 'code';
    }
    case ItemSortFieldInput.Name:
    default: {
      return 'name';
    }
  }
};

const createTypedListResponse = <T, K>(
  totalCount: number,
  nodes: T[],
  typeName: K
) => ({
  totalCount,
  nodes,
  __typename: typeName,
});

export const item = {
  byId: (id: string): ResolvedItem => {
    const item = db.item.get.byId(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }

    const stockLines = db.stockLine.get.byItemId(id);
    const availableBatches = ResolverService.stockLine.list(stockLines);

    const availableQuantity = getAvailableQuantity(id);

    return {
      __typename: 'ItemNode',
      ...item,
      availableQuantity,
      availableBatches,
    };
  },
  list: (params: ItemListParameters): ItemsResponse => {
    const items = db.get.all.item();
    const resolvedItems = items.map(item => ResolverService.item.byId(item.id));

    const { filter, page = {}, sort = [] } = params ?? {};
    const { offset = 0, first = 20 } = page ?? {};
    const { key = 'name', desc = false } = sort && sort[0] ? sort[0] : {};

    let filtered = resolvedItems;

    if (filter) {
      filtered = filtered.filter(({ code, name }) => {
        if (filter.code?.equalTo) {
          return code.toLowerCase() === filter.code.equalTo.toLowerCase();
        }

        if (filter.code?.like) {
          return code
            .toLowerCase()
            .includes(filter.code.like.toLowerCase() ?? '');
        }

        if (filter.name?.equalTo) {
          return name.toLowerCase() === filter.name.equalTo.toLowerCase();
        }

        if (filter.name?.like) {
          return name.toLowerCase().includes(filter.name.like.toLowerCase());
        }

        return true;
      });
    }

    const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

    if (key) {
      paged.sort(getDataSorter(getItemsSortKey(key), !!desc));
    }

    return createTypedListResponse(filtered.length, paged, 'ItemConnector');
  },
};
