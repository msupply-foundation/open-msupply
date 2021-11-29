import { Api } from '../api';
import { ItemListParameters, ItemsResponse } from '../data/types';

const QueryResolvers = {
  items: (_: unknown, vars: ItemListParameters): ItemsResponse => {
    return Api.ResolverService.item.list(vars);
  },
};

export const Item = { QueryResolvers };
