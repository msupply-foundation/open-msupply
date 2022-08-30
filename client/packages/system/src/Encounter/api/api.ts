import {
  SortBy,
  FilterBy,
  InsertEncounterInput,
  UpdateEncounterInput,
  EncounterSortFieldInput,
} from '@openmsupply-client/common';
import {
  EncounterDocumentRegistryFragment,
  EncounterFragment,
  EncounterRowFragment,
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
      nodes: EncounterRowFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.encounters({
        storeId,
        key: sortBy?.key as EncounterSortFieldInput | undefined,
        desc: sortBy?.isDesc,
        filter: filterBy,
        latestEventTime: new Date().toISOString(),
      });

      return result?.encounters;
    },
    registries: async ({
      filterBy,
    }: ListParams): Promise<{
      nodes: EncounterDocumentRegistryFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.encounterDocumentRegistries({
        filter: filterBy,
      });
      return result?.documentRegistries;
    },
    byId: async (encounterId: string): Promise<EncounterFragment> => {
      const result = await sdk.encounterById({ encounterId, storeId });
      const encounters = result?.encounters;

      if (
        encounters?.__typename === 'EncounterConnector' &&
        !!encounters.nodes[0]
      ) {
        return encounters.nodes[0];
      } else {
        throw new Error('Could not find encounter');
      }
    },
  },

  insertEncounter: async (
    input: InsertEncounterInput
  ): Promise<EncounterFragment> => {
    const result = await sdk.insertEncounter({
      storeId,
      input,
    });

    if (result.insertEncounter.__typename === 'EncounterNode') {
      return result.insertEncounter;
    }

    throw new Error('Could not insert encounter');
  },

  updateEncounter: async (
    input: UpdateEncounterInput
  ): Promise<EncounterFragment> => {
    const result = await sdk.updateEncounter({
      storeId,
      input,
    });

    if (result.updateEncounter.__typename === 'EncounterNode') {
      return result.updateEncounter;
    }

    throw new Error('Could not update encounter');
  },
});
