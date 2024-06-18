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
const Parsers = {
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
  toInsertIndicator: (
    input: DemographicIndicatorFragment
  ): InsertDemographicIndicatorInput => {
    return {
      id: input.id,
      name: input.name,
      baseYear: input.baseYear,
      basePopulation: input.basePopulation,
      populationPercentage: input.populationPercentage,
      year1Projection: input.year1Projection,
      year2Projection: input.year2Projection,
      year3Projection: input.year3Projection,
      year4Projection: input.year4Projection,
      year5Projection: input.year5Projection,
    };
  },
  toUpdateIndicator: (
    input: DemographicIndicatorFragment
  ): UpdateDemographicIndicatorInput => {
    return {
      id: input.id,
      name: input.name,
      baseYear: input.baseYear,
      populationPercentage: input.populationPercentage,
      basePopulation: input.basePopulation,
      year1Projection: input.year1Projection,
      year2Projection: input.year2Projection,
      year3Projection: input.year3Projection,
      year4Projection: input.year4Projection,
      year5Projection: input.year5Projection,
    };
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
        key: Parsers.toIndicatorSortField(sortBy),
        desc: sortBy.isDesc,
        filter: filterBy,
      });

      return result?.demographicIndicators;
    },
    listAll: async ({ sortBy }: ListParams<DemographicIndicatorFragment>) => {
      const result = await sdk.demographicIndicators({
        key: Parsers.toIndicatorSortField(sortBy),
        desc: sortBy.isDesc,
      });

      const demographicIndicators = result?.demographicIndicators;
      return demographicIndicators;
    },
  },
  getProjections: {
    byBaseYear: async (baseYear: number) => {
      const result = await sdk.demographicProjectionsByBaseYear({ baseYear });
      if (
        result.demographicProjectionByBaseYear.__typename ===
        'DemographicProjectionNode'
      )
        return result.demographicProjectionByBaseYear;

      return undefined;
    },
    list: async ({
      first,
      offset,
      filterBy,
    }: Omit<ListParams<DemographicProjectionFragment>, 'sortBy'>) => {
      const result = await sdk.demographicProjections({
        first,
        offset,
        key: DemographicProjectionSortFieldInput.Id,
        filter: filterBy,
      });
      const demographicProjections = result?.demographicProjections;
      return demographicProjections;
    },
  },
  insertIndicator: async (input: DemographicIndicatorFragment) => {
    const insertInput: InsertDemographicIndicatorInput =
      Parsers.toInsertIndicator(input);
    const result = await sdk.insertDemographicIndicator({ input: insertInput });

    if (
      result.centralServer?.demographic?.insertDemographicIndicator
        ?.__typename === 'DemographicIndicatorNode'
    ) {
      return result.centralServer.demographic.insertDemographicIndicator;
    }

    throw new Error('could not insert demographic indicator');
  },
  updateIndicator: async (input: DemographicIndicatorFragment) => {
    const updateInput: UpdateDemographicIndicatorInput =
      Parsers.toUpdateIndicator(input);
    const result = await sdk.updateDemographicIndicator({
      input: updateInput,
    });
    if (
      result.centralServer?.demographic?.updateDemographicIndicator
        ?.__typename === 'DemographicIndicatorNode'
    ) {
      return result.centralServer.demographic.updateDemographicIndicator;
    }
  },
  insertProjection: async (input: InsertDemographicProjectionInput) => {
    const result = await sdk.insertDemographicProjection({
      input,
    });
    if (
      result.centralServer?.demographic?.insertDemographicProjection
        ?.__typename === 'DemographicProjectionNode'
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
      result.centralServer?.demographic?.updateDemographicProjection
        ?.__typename === 'DemographicProjectionNode'
    ) {
      return result.centralServer.demographic.updateDemographicProjection;
    }
  },
});
