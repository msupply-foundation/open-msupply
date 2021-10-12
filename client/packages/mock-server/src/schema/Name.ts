import { ListResponse } from './../index';
import { Api } from '../api';
import { Name as NameType } from '../data/types';

const Types = `
type Name {
    id: String
    name: String
    code: String
    isCustomer: Boolean
    isSupplier: Boolean
}

type NameResponse { 
    data: [Name],
    totalLength: Int
}
`;

const Queries = `
    names: NameResponse
`;

const QueryResolvers = {
  names: (): ListResponse<NameType> => {
    return Api.ResolverService.list.name();
  },
};

export const Name = { Types, Queries, QueryResolvers };
