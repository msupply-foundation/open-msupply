import { ListParams } from '@openmsupply-client/common';
import { Sdk } from 'packages/invoices/src/Returns';

export const getDemographicIndicatorQueries = (sdk: Sdk) => ({
  getIndicators: {
    byId: async (demographicIndicatorId: string) => {
      const result = await sdk.demographicIndicatorById({
        demographicIndicatorId,
      });
      const { demographicIndicators } = result;
      if (
        demographicIndicators?.__typename === 'EncounterConnector' &&
        !!demographicIndicators.nodes[0]
      ) {
        return demographicIndicators.nodes[0];
      } else {
        throw new Error('Could not find encounter');
      }
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<IndicatorDemographicFragment>) => {
      const result = await sdk.demographicIndicators({
        first,
        offset,
        key: sortBy.key,
        desc: sortBy.isDesc,
        filter: filterBy,
      });
      const demographicIndicators = result?.DemographicIndicators;
      return demographicIndicators;
    },
    listAll: async ({ sortBy }: ListParams<IndicatorDemographicFragment>) => {
      const result = await sdk.demographicIndicators({
        key: sortBy.key,
        desc: sortBy.isDesc,
      });

      const demographicIndicators = result?.DemographicIndicators;
      return demographicIndicators;
    },
  },
  getProjections: {
    byId: async (demographicProjectionId: string) => {
      const result = await sdk.demographicProjectionById({
        demographicProjectionId,
      });
      const { demographicProjections } = result;
      if (
        demographicProjections?.__typename === 'EncounterConnector' &&
        !!demographicProjections.nodes[0]
      ) {
        return demographicProjections.nodes[0];
      } else {
        throw new Error('Could not find encounter');
      }
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<ProjectionDemographicFragment>) => {
      const result = await sdk.demographicProjections({
        first,
        offset,
        key: sortBy.key,
        desc: sortBy.isDesc,
        filter: filterBy,
      });
      const demographicProjections = result?.DemographicProjections;
      return demographicProjections;
    },
    listAll: async ({ sortBy }: ListParams<ProjectionDemographicFragment>) => {
      const result = await sdk.demographicProjections({
        key: sortBy.key,
        desc: sortBy.isDesc,
      });

      const demographicProjections = result?.DemographicProjections;
      return demographicProjections;
    },
  },
  insertIndicator: async (input: InsertDemographicIndicatorInput) => {
    const result = await sdk.insertDemographicIndicator({
        input
    })
    if (result.insertDemographicIndicator.__typename === "DemographicIndicatorNode" ){
        return result.insertDemographicIndicator
    }
    throw new Error("could not insert demographic indicator")
  }
  updateIndicator: async (input: UpdateDemographicIndicatorInput) => {
    const result = await sdk.updateDemographicIndicator({
        input
    })
    if (result)
  }
  insertProjection: async(input: InsertDemographicProjectionInput) => {
    const result = await sdk.insertDemographicProjection({
        input
    })
    if (result.insertDemographicProjection.__typename === "DemographicProjectionNode" ){
        return result.insertDemographicProjection
    }
    throw new Error("could not insert demographic projection")
  }
  updateProjection: async (input: UpdateDemographicProjectionInput) => {
    const result = await sdk.updateDemographicProjection({
        input
    })
    if (result)
  }
});
