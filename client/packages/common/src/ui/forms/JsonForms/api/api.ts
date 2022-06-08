import {
  SortBy,
  LocationSortInput,
  LocationSortFieldInput,
  InsertLocationInput,
  UpdateLocationInput,
  DeleteLocationInput,
} from '@openmsupply-client/common';
import { Sdk, LocationRowFragment } from './operations.generated';

export type ListParams = { sortBy: SortBy<LocationRowFragment> };

const locationParsers = {
  toSortInput: (sortBy: SortBy<LocationRowFragment>): LocationSortInput => {
    return { desc: sortBy.isDesc, key: sortBy.key as LocationSortFieldInput };
  },
  toDelete: (location: LocationRowFragment): DeleteLocationInput => ({
    id: location.id,
  }),
  toInsert: (location: LocationRowFragment): InsertLocationInput => ({
    id: location?.id,
    name: location?.name,
    code: location?.code,
    onHold: location?.onHold,
  }),
  toUpdate: (location: LocationRowFragment): UpdateLocationInput => ({
    id: location?.id,
    name: location?.name,
    code: location?.code,
    onHold: location?.onHold,
  }),
};

export const getLocationQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ sortBy }: ListParams) => {
      const response = await sdk.locations({
        sort: [locationParsers.toSortInput(sortBy)],
        storeId,
      });
      return response?.locations;
    },
  },
  insert: (location: LocationRowFragment) =>
    sdk.insertLocation({ input: locationParsers.toInsert(location), storeId }),
  update: (location: LocationRowFragment) =>
    sdk.updateLocation({ input: locationParsers.toUpdate(location), storeId }),
  delete: (location: LocationRowFragment) =>
    sdk.deleteLocation({ input: locationParsers.toDelete(location), storeId }),
});
