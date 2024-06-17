import { SortBy, useGql } from '@openmsupply-client/common';
import { ListParams, getDemographicIndicatorQueries } from '../../api';
import {
  DemographicIndicatorFragment,
  DemographicProjectionFragment,
  getSdk,
} from '../../operations.generated';
export const useDemographicsApi = () => {
  const { client } = useGql();

  const keys = {
    baseIndicator: () => ['demographic indicator'] as const,
    detailIndicator: (id: string) => [...keys.baseIndicator(), id] as const,
    indicatorList: () => [...keys.baseIndicator(), 'list'] as const,
    paramIndicatorList: (params: ListParams<DemographicIndicatorFragment>) =>
      [...keys.indicatorList(), params] as const,
    sortedIndicatorList: (sortBy: SortBy<DemographicIndicatorFragment>) =>
      [...keys.indicatorList(), sortBy] as const,
    baseProjection: () => ['demographic projection'] as const,
    detailProjection: (id: string) => [...keys.baseProjection(), id] as const,
    projection: (baseYear: number) =>
      [...keys.baseProjection(), baseYear] as const,
    projectionList: () => [...keys.baseProjection(), 'list'] as const,
    paramProjectionList: (baseYear: number) =>
      [...keys.projectionList(), baseYear] as const,
    sortedProjectionList: (sortBy: SortBy<DemographicProjectionFragment>) =>
      [...keys.projectionList(), sortBy] as const,
  };

  const queries = getDemographicIndicatorQueries(getSdk(client));
  return { ...queries, keys };
};
