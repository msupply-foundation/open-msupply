import { useQuery, ReportCategory } from '@openmsupply-client/common';
import { useReportApi } from '../utils/useReportApi';

export const useReports = (category?: ReportCategory) => {
  const api = useReportApi();
  const filterBy = category ? { category: { equalTo: category } } : null;
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
