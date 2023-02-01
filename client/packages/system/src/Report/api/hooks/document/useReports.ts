import { useQuery, ReportContext } from '@openmsupply-client/common';
import { useReportApi } from '../utils/useReportApi';

export const useReports = (context?: ReportContext, subContext?: string) => {
  const api = useReportApi();
  const filterBy =
    context || subContext
      ? {
          context: context ? { equalTo: context } : null,
          subContext: subContext ? { equalTo: subContext } : null,
        }
      : null;
  const queryParams = {
    filterBy,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
  };
  return useQuery(
    api.keys.paramList(queryParams),
    async () => api.get.list(queryParams),
    {
      onError: (e: Error) => {
        if (/HasPermission\(Report\)/.test(e.message)) return null;
        return [];
      },
    }
  );
};
