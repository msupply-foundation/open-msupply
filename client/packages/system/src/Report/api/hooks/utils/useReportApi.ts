import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { getReportQueries, ReportListParams } from '../../api';

export const useReportApi = () => {
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
