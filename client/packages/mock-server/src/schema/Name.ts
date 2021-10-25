import { Api } from '../api';
import { ListResponse, Name as NameType } from '../data/types';

const QueryResolvers = {
  names: (): ListResponse<NameType> => {
    return Api.ResolverService.list.name('customer');
  },
};

export const Name = { QueryResolvers };
