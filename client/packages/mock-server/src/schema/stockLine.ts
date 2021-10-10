import { StockLine as StockLineType } from '../data/types';
import { ListResponse } from './../index';
import { Api } from '../api';

const Types = `
type StockLine { 
  id: String
  expiry: String
  name: String
  availableNumberOfPacks: Int
  packSize: Int
  item: Item
}
`;

const Queries = `
    stockLines: [StockLine]
`;

const QueryResolvers = {
  stockLines: (): ListResponse<StockLineType> => {
    return Api.ResolverService.list.stockLine();
  },
};

export const StockLine = {
  Types,
  Queries,
  QueryResolvers,
};
