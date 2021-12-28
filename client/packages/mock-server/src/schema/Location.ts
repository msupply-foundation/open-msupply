import { Api } from './../api/index';
import { LocationsResponse } from '@openmsupply-client/common/src/types';

const QueryResolvers = {
  locations: (): LocationsResponse => {
    return Api.ResolverService.location.list();
  },
};

const MutationResolvers = {};

export const Location = {
  QueryResolvers,
  MutationResolvers,
};
