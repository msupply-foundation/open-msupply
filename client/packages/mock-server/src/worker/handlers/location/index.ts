import { ResolverService } from './../../../api/resolvers';
import { MutationService } from './../../../api/mutations';
import {
  mockLocationsQuery,
  mockInsertLocationMutation,
  mockUpdateLocationMutation,
} from '@openmsupply-client/common/src/types/schema';

const locationsQuery = mockLocationsQuery((req, res, ctx) => {
  const locationsResponse = ResolverService.location.list(req.variables);

  return res(ctx.data({ locations: locationsResponse }));
});

const insertLocation = mockInsertLocationMutation((req, res, ctx) => {
  const inserted = MutationService.location.insert(req.variables.input);
  return res(ctx.data({ insertLocation: inserted }));
});

const updateLocation = mockUpdateLocationMutation((req, res, ctx) => {
  const updated = MutationService.location.update(req.variables.input);
  return res(ctx.data({ updateLocation: updated }));
});

export const LocationHandlers = [
  locationsQuery,
  insertLocation,
  updateLocation,
];
