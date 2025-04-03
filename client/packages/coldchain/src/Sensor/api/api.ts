import { FilterByWithBoolean, SortBy } from '@common/hooks';
import { Sdk, SensorFragment } from './operations.generated';
import { RecordPatch } from '@common/types';
import { setNullableInput } from '@common/utils';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<SensorFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const getSensorQueries = (sdk: Sdk, storeId: string) => ({
  update: async (patch: RecordPatch<SensorFragment>) => {
    const result = await sdk.updateSensor({
      storeId,
      input: {
        id: patch.id,
        isActive: patch.isActive,
        name: patch.name,
        locationId: setNullableInput('id', patch.location),
      },
    });

    return result?.updateSensor;
  },
});
