import { ListResponse } from './../index';
import { Api } from '../api';
import { Item as ItemType } from '../data/types';

const Types = `
type Item {
    id: String
    name: String
    code: String
    availableQuantity: Int
}
`;

const Queries = `
    items: [Item]
`;

const QueryResolvers = {
  items: (): ListResponse<ItemType> => {
    return Api.ResolverService.list.item();
  },
};

export const Item = { Types, Queries, QueryResolvers };
