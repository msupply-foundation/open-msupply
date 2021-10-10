import { ResolvedStockLine } from '../data/types';
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

    type StockLineResponse { 
      data: [StockLine],
      totalLength: Int
    }

`;

const Queries = `
    stockLines: StockLineResponse
`;

const QueryResolvers = {
  stockLines: (): ListResponse<ResolvedStockLine> => {
    return Api.ResolverService.list.stockLine();
  },
};

export const StockLine = {
  Types,
  Queries,
  QueryResolvers,
};
