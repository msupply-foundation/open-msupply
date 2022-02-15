import { ResolverService } from './../api/resolvers/index';
import {
  MasterListsResponse,
  MasterListsQueryVariables,
} from '@openmsupply-client/common/src/types/schema';

const QueryResolvers = {
  masterLists: (
    _: unknown,
    vars: { params: MasterListsQueryVariables }
  ): MasterListsResponse => {
    return ResolverService.masterList.list(vars.params);
  },
};

export const MasterList = {
  QueryResolvers,
};
