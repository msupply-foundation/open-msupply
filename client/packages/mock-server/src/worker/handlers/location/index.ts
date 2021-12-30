import { ResolverService } from './../../../api/resolvers';
import { mockLocationsQuery } from '@openmsupply-client/common/src/types/schema';

const locationsQuery = mockLocationsQuery((req, res, ctx) => {
  const locationsResponse = ResolverService.location.list(req.variables);

  return res(ctx.data({ locations: locationsResponse }));
});

export const LocationHandlers = [locationsQuery];
