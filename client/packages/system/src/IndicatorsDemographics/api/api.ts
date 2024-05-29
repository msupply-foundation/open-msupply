import {
  DemographicIndicatorSortFieldInput,
  DemographicProjectionSortFieldInput,
  FilterByWithBoolean,
  InsertDemographicIndicatorInput,
  InsertDemographicProjectionInput,
  SortBy,
  UpdateDemographicIndicatorInput,
  UpdateDemographicProjectionInput,
} from '@openmsupply-client/common';
import {
  DemographicIndicatorFragment,
  DemographicProjectionFragment,
  Sdk,
} from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};
// Leaving this here as probably want to sort by other values in future ie population percentage
const itemParsers = {
  toIndicatorSortField: (sortBy: SortBy<DemographicIndicatorFragment>) => {
    const fields: Record<string, DemographicIndicatorSortFieldInput> = {
      id: DemographicIndicatorSortFieldInput.Id,
      name: DemographicIndicatorSortFieldInput.Name,
    };
    return fields[sortBy.key] ?? DemographicIndicatorSortFieldInput.Id;
  },
  toProjectionSortFIeld: (sortBy: SortBy<DemographicProjectionFragment>) => {
    const fields: Record<string, DemographicIndicatorSortFieldInput> = {
      id: DemographicIndicatorSortFieldInput.Id,
    };
    return fields[sortBy.key] ?? DemographicProjectionSortFieldInput.Id;
  },
};

export const getDemographicIndicatorQueries = (sdk: Sdk) => ({
  getIndicators: {
    byId: async (demographicIndicatorId: string) => {
      const result = await sdk.demographicIndicatorById({
        demographicIndicatorId,
      });
      const { demographicIndicators } = result;
      if (
        demographicIndicators?.__typename === 'DemographicIndicatorConnector' &&
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
    }: ListParams<DemographicIndicatorFragment>) => {
      const result = await sdk.demographicIndicators({
        first,
        offset,
        key: itemParsers.toIndicatorSortField(sortBy),
        desc: sortBy.isDesc,
        filter: filterBy,
      });
      const demographicIndicators = result?.demographicIndicators;
      return demographicIndicators;
    },
    listAll: async ({ sortBy }: ListParams<DemographicIndicatorFragment>) => {
      const result = await sdk.demographicIndicators({
        key: itemParsers.toIndicatorSortField(sortBy),
        desc: sortBy.isDesc,
      });

      const demographicIndicators = result?.demographicIndicators;
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
        demographicProjections?.__typename ===
          'DemographicProjectionConnector' &&
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
    }: ListParams<DemographicProjectionFragment>) => {
      const result = await sdk.demographicProjections({
        first,
        offset,
        key: DemographicProjectionSortFieldInput.Id,
        desc: sortBy.isDesc,
        filter: filterBy,
      });
      const demographicProjections = result?.demographicProjections;
      return demographicProjections;
    },
    listAll: async ({ sortBy }: ListParams<DemographicProjectionFragment>) => {
      const result = await sdk.demographicProjections({
        key: DemographicProjectionSortFieldInput.Id,
        desc: sortBy.isDesc,
      });
      const demographicProjections = result?.demographicProjections;
      return demographicProjections;
    },
  },
  insertIndicator: async (input: InsertDemographicIndicatorInput) => {
    const result = await sdk.insertDemographicIndicator({
      input,
    });
    if (
      result.centralServer.demographic.insertDemographicIndicator.__typename ===
      'DemographicIndicatorNode'
    ) {
      return result.centralServer.demographic.insertDemographicIndicator;
    }
    throw new Error('could not insert demographic indicator');
  },
  updateIndicator: async (input: UpdateDemographicIndicatorInput) => {
    const result = await sdk.updateDemographicIndicator({
      input,
    });
    if (
      result.centralServer.demographic.updateDemographicIndicator.__typename ===
      'DemographicIndicatorNode'
    ) {
      return result.centralServer.demographic.updateDemographicIndicator;
    }
  },
  insertProjection: async (input: InsertDemographicProjectionInput) => {
    const result = await sdk.insertDemographicProjection({
      input,
    });
    if (
      result.centralServer.demographic.insertDemographicProjection
        .__typename === 'DemographicProjectionNode'
    ) {
      return result.centralServer.demographic.insertDemographicProjection;
    }
    throw new Error('could not insert demographic projection');
  },
  updateProjection: async (input: UpdateDemographicProjectionInput) => {
    const result = await sdk.updateDemographicProjection({
      input,
    });
    if (
      result.centralServer.demographic.updateDemographicProjection
        .__typename === 'DemographicProjectionNode'
    ) {
      return result.centralServer.demographic.updateDemographicProjection;
    }
  },
});
