import { useQuery, ReportContext } from '@openmsupply-client/common';
import { ReportListParams } from '../../api';
import { useReportApi } from '../utils/useReportApi';

export const useReports = ({
  context,
  subContext,
  queryParams,
}: {
  context?: ReportContext;
  subContext?: string;
  queryParams?: ReportListParams;
}) => {
  const api = useReportApi();
  const filterBy =
    context || subContext
      ? {
          context: context ? { equalTo: context } : null,
          subContext: subContext ? { equalTo: subContext } : null,
        }
      : null;
  const queryParameters = {
    filterBy: { ...queryParams?.filterBy, ...filterBy },
    sortBy: queryParams?.sortBy || {
      key: 'name',
      isDesc: false,
      direction: 'asc' as 'asc' | 'desc',
    },
    offset: queryParams?.offset || 0,
  };

  return useQuery(
    api.keys.paramList(queryParameters),
    async () => api.get.list(queryParameters),
    {
      onError: (e: Error) => {
        if (/HasPermission\(Report\)/.test(e.message)) return null;
        return [];
      },
    }
  );
};
