import { Api } from './../api/index';
import {
  LocationSortInput,
  LocationsResponse,
} from '@openmsupply-client/common/src/types';

const QueryResolvers = {
  locations: (
    _: any,
    vars: {
      sort?: LocationSortInput | LocationSortInput[] | null;
    }
  ): LocationsResponse => {
    return Api.ResolverService.location.list(vars);
  },
};

const MutationResolvers = {};

export const Location = {
  QueryResolvers,
  MutationResolvers,
};
