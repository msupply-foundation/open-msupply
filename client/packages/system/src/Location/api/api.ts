import {
  InsertLocationInput,
  UpdateLocationInput,
  DeleteLocationInput,
} from '@openmsupply-client/common';
import { Sdk, LocationRowFragment } from './operations.generated';

const locationParsers = {
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
  insert: (location: LocationRowFragment) =>
    sdk.insertLocation({ input: locationParsers.toInsert(location), storeId }),
  update: (location: LocationRowFragment) =>
    sdk.updateLocation({ input: locationParsers.toUpdate(location), storeId }),
  delete: (location: LocationRowFragment) =>
    sdk.deleteLocation({ input: locationParsers.toDelete(location), storeId }),
});
