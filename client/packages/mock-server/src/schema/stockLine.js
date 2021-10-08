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
  stockLines: () => {
    return Api.ResolverService.list.stockLine();
  },
};

export const StockLine = {
  Types,
  Queries,
  QueryResolvers,
};
