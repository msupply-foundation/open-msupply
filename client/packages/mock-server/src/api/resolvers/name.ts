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
    // TODO: Filter customers/suppliers etc
    const names = db.get.all.name().filter(({ isCustomer }) => isCustomer);
    const resolvedNames = names.map(name => nameResolver.byId(name.id));

    const { page = {}, sort = [] } = params ?? {};

    const { offset = 0, first = 20 } = page ?? {};
    const { key = 'name', desc = false } = sort && sort[0] ? sort[0] : {};

    if (key) {
      resolvedNames.sort(getDataSorter(getNamesSortKey(key), !!desc));
    }

    const paged = resolvedNames.slice(
      offset ?? 0,
      (offset ?? 0) + (first ?? 20)
    );

    return createListResponse(paged.length, paged, 'NameConnector');
  },
  byId: (id: string): ResolvedName => {
    return { __typename: 'NameNode', ...db.get.byId.name(id) };
  },
};
