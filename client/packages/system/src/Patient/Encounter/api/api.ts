import {
  SortBy,
  FilterBy,
  InsertEncounterInput,
  UpdateEncounterInput,
  EncounterSortFieldInput,
} from '@openmsupply-client/common';
import {
  EncounterDocumentFragment,
  EncounterFragment,
  Sdk,
} from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<EncounterFragment>;
  filterBy?: FilterBy | null;
};

export const getEncounterQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: EncounterFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.encounters({
        storeId,
        key: sortBy?.key as EncounterSortFieldInput | undefined,
        desc: sortBy?.isDesc,
        filter: filterBy,
      });

      return result?.encounters;
    },
  },

  insertEncounter: async (
    input: InsertEncounterInput
  ): Promise<EncounterDocumentFragment> => {
    const result = await sdk.insertEncounter({
      storeId,
      input,
    });

    if (result.insertEncounter.__typename === 'DocumentNode') {
      return result.insertEncounter;
    }

    throw new Error('Could not insert encounter');
  },

  updateEncounter: async (
    input: UpdateEncounterInput
  ): Promise<EncounterDocumentFragment> => {
    const result = await sdk.updateEncounter({
      storeId,
      input,
    });

    if (result.updateEncounter.__typename === 'DocumentNode') {
      return result.updateEncounter;
    }

    throw new Error('Could not update encounter');
  },
});
