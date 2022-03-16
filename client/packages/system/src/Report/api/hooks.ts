import {
  useGql,
  useQueryParams,
  useQuery,
  useAuthContext,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { getReportQueries, ReportListParams } from './api';

const useReportApi = () => {
  const keys = {
    base: () => ['report'] as const,
    print: (dataId: string, reportId: string) =>
      [...keys.base(), dataId, reportId] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ReportListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getReportQueries(sdk, storeId);
  return { ...queries, keys };
};

export const useReports = () => {
  const api = useReportApi();
  const initialListParameters = { initialSortBy: { key: 'name' } };
  const { filterBy, queryParams, sortBy, offset } = useQueryParams(
    initialListParameters
  );

  return useQuery(api.keys.paramList(queryParams), async () =>
    api.get.list({ filterBy, sortBy, offset })
  );
};
