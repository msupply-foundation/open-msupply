import {
  SortBy,
  LocationSortInput,
  LocationSortFieldInput,
  InsertLocationInput,
  UpdateLocationInput,
  DeleteLocationInput,
  LocationFilterInput,
} from '@openmsupply-client/common';
import { Sdk, LocationRowFragment } from './operations.generated';

export type ListParams = {
  sortBy: SortBy<LocationRowFragment>;
  first?: number;
  offset?: number;
  filterBy: LocationFilterInput | null;
};

const locationParsers = {
  toSortInput: (sortBy: SortBy<LocationRowFragment>): LocationSortInput => ({
    desc: sortBy.isDesc,
    key: sortBy.key as LocationSortFieldInput,
  }),
  toDelete: (location: LocationRowFragment): DeleteLocationInput => ({
    id: location.id,
  }),
  toInsert: (location: LocationRowFragment): InsertLocationInput => ({
    id: location?.id,
    name: location?.name,
    code: location?.code,
    onHold: location?.onHold,
    coldStorageTypeId: location?.coldStorageType?.id ?? null,
  }),
  toUpdate: (location: LocationRowFragment): UpdateLocationInput => {
    return {
      id: location?.id,
      name: location?.name,
      code: location?.code,
      onHold: location?.onHold,
      coldStorageTypeId: location?.coldStorageType?.id ?? null,
    };
  },
};

export const getLocationQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ sortBy, first, offset, filterBy }: ListParams) => {
      const response = await sdk.locations({
        first,
        offset,
        sort: [locationParsers.toSortInput(sortBy)],
        storeId,
        filter: filterBy,
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
