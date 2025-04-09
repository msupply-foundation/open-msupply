import { DeleteLocationInput } from '@openmsupply-client/common';
import { Sdk, LocationRowFragment } from './operations.generated';

const locationParsers = {
  toDelete: (location: LocationRowFragment): DeleteLocationInput => ({
    id: location.id,
  }),
};

export const getLocationQueries = (sdk: Sdk, storeId: string) => ({
  delete: (location: LocationRowFragment) =>
    sdk.deleteLocation({ input: locationParsers.toDelete(location), storeId }),
});
