import { FilterBy, SortBy } from '@common/hooks';
import { Sdk, SensorFragment } from './operations.generated';
import { RecordPatch, SensorSortFieldInput } from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<SensorFragment>;
  filterBy: FilterBy | null;
};

export const getSensorQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const result = await sdk.sensors({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as SensorSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });

        return result?.sensors;
      },
  },
  update: async (patch: RecordPatch<SensorFragment>) => {
    console.log('patch', patch);
    const result = await sdk.updateSensor({
      storeId,
      input: {
        id: patch.id,
        isActive: patch.isActive,
        name: patch.name,
        locationId: patch?.location?.id,
      },
    });

    return result?.updateSensor;
  },
});
