import { Api } from '../api';
import { ListResponse, Item as ItemType } from '../data/types';

const QueryResolvers = {
  items: (): ListResponse<ItemType> => {
    return Api.ResolverService.list.item();
  },
};

export const Item = { QueryResolvers };
