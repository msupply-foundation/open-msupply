import { mockNamesQuery } from '@openmsupply-client/common/src/types/schema';
import { ResolverService } from '../../../api/resolvers';

const mockNamesList = mockNamesQuery((req, res, ctx) => {
  const { variables } = req;

  const result = ResolverService.name.list(variables);

  return res(ctx.data({ names: result }));
});

export const NameHandlers = [mockNamesList];
