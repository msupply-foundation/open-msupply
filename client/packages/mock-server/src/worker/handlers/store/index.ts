import { mockStoresQuery } from '@openmsupply-client/common/src/types/schema';
import { ResolverService } from '../../../api/resolvers';

const mockStoresList = mockStoresQuery((_, res, ctx) => {
  const result = ResolverService.store.list();

  return res(ctx.data({ stores: result }));
});

export const StoreHandlers = [mockStoresList];
