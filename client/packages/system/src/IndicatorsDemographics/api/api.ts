import {
  DemographicIndicatorSortFieldInput,
  DemographicProjectionSortFieldInput,
  FilterByWithBoolean,
  InsertDemographicIndicatorInput,
  InsertDemographicProjectionInput,
  isEmpty,
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
  insertIndicator: async (input: InsertDemographicIndicatorInput) => {
    const apiResult = await sdk.insertDemographicIndicator({
      input,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result =
        apiResult.centralServer.demographic.insertDemographicIndicator;
      if (result.__typename === 'DemographicIndicatorNode') {
        return result;
      }
    }

    throw new Error('could not insert demographic indicator');
  },
  updateIndicator: async (input: UpdateDemographicIndicatorInput) => {
    const apiResult = await sdk.updateDemographicIndicator({
      input,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result =
        apiResult.centralServer.demographic.updateDemographicIndicator;
      if (result.__typename === 'DemographicIndicatorNode') {
        return result;
      }
    }
  },
  insertProjection: async (input: InsertDemographicProjectionInput) => {
    const apiResult = await sdk.insertDemographicProjection({
      input,
    });
    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result =
        apiResult.centralServer.demographic.insertDemographicProjection;
      if (result.__typename === 'DemographicProjectionNode') {
        return result;
      }
    }
    throw new Error('could not insert demographic projection');
  },
  updateProjection: async (input: UpdateDemographicProjectionInput) => {
    const apiResult = await sdk.updateDemographicProjection({
      input,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result =
        apiResult.centralServer?.demographic?.updateDemographicProjection;
      if (result.__typename === 'DemographicProjectionNode') {
        return result;
      }
    }
  },
});
