import { ListResponse } from './../index';
import { Api } from '../api';
import { Item as ItemType } from '../data/types';

const Types = `
type AvailableBatches {
  nodes: [StockLine]
}

type Item {
    id: String
    isVisible: Boolean
    name: String
    code: String
    availableQuantity: Int
    availableBatches: AvailableBatches
}

type ItemResponse { 
    data: [Item],
    totalLength: Int
}

`;

const Queries = `
    items: ItemResponse
`;

const QueryResolvers = {
  items: (): ListResponse<ItemType> => {
    return Api.ResolverService.list.item();
  },
};

export const Item = { Types, Queries, QueryResolvers };
