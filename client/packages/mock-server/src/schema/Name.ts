import { NamesResponse } from './../../../common/src/types/schema';
import { NameListParameters } from './../data/types';
import { Api } from '../api';

const QueryResolvers = {
  names: (_: unknown, vars: NameListParameters): NamesResponse => {
    return Api.ResolverService.name.list(vars);
  },
};

export const Name = { QueryResolvers };
