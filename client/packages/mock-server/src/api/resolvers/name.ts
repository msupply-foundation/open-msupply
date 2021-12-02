import { getDataSorter } from './../../../../common/src/utils/arrays/sorters';
import { db } from './../../data/database';
import {
  NameListParameters,
  ListResponse,
  ResolvedName,
} from './../../data/types';
import { NameSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import { createListResponse } from './utils';

const getNamesSortKey = (key: string) => {
  switch (key) {
    case NameSortFieldInput.Code: {
      return 'code';
    }
    case NameSortFieldInput.Name:
    default: {
      return 'name';
    }
  }
};

export const nameResolver = {
  list: (
    params: NameListParameters
  ): ListResponse<ResolvedName, 'NameConnector'> => {
    const names = db.get.all.name();
    const resolvedNames = names.map(name => nameResolver.byId(name.id));

    const { page = {}, sort = [], filter } = params ?? {};

    const { offset = 0, first = 20 } = page ?? {};
    const { key = 'name', desc = false } = sort && sort[0] ? sort[0] : {};

    let filteredData = resolvedNames;

    if (filter) {
      if (filter.isCustomer) {
        filteredData = filteredData.filter(({ isCustomer }) => isCustomer);
      }

      if (filter.isSupplier) {
        filteredData = filteredData.filter(({ isSupplier }) => isSupplier);
      }
    }
    if (key) {
      filteredData.sort(getDataSorter(getNamesSortKey(key), !!desc));
    }

    const paged = filteredData.slice(
      offset ?? 0,
      (offset ?? 0) + (first ?? 20)
    );

    return createListResponse(paged.length, paged, 'NameConnector');
  },
  byId: (id: string): ResolvedName => {
    return { __typename: 'NameNode', ...db.get.byId.name(id) };
  },
};
