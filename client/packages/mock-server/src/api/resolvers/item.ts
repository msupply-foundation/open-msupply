import { ListResponse } from './../../data/types';
import { ItemSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
import { ResolverService } from './index';
import { createListResponse } from './utils';

import { db, ResolvedItem, ItemListParameters } from '../../data';

const getAvailableQuantity = (itemId: string): number => {
  const stockLines = db.get.stockLines.byItemId(itemId);
  const availableQuantity = stockLines.reduce(
    (sum, { availableNumberOfPacks, packSize }) => {
      return sum + availableNumberOfPacks * packSize;
    },
    0
  );

  return availableQuantity;
};

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

export const itemResolver = {
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
      stats: {
        averageMonthlyConsumption: 0,
        stockOnHand: 0,
        monthsOfStock: 0,
      },
    };
  },
  list: (
    params: ItemListParameters
  ): ListResponse<ResolvedItem, 'ItemConnector'> => {
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

    return createListResponse(filtered.length, paged, 'ItemConnector');
  },
};
