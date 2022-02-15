import { mockMasterListsQuery } from '@openmsupply-client/common/src/types';
import { ResolverService } from '../../../api/resolvers';

const masterListsQuery = mockMasterListsQuery((req, res, ctx) => {
  return res(
    ctx.data({
      // trouble typing the response correctly.. gave up. it's only mocks after all
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      masterLists: ResolverService.masterList.list(req?.variables) as any,
    })
  );
});

export const MasterListHandlers = [masterListsQuery];
