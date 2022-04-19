import {
  useGql,
  useQueryParams,
  useQuery,
  useAuthContext,
  ReportCategory,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { getReportQueries, ReportListParams } from './api';
import { Environment } from '@openmsupply-client/config';

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

export const useReports = (category?: ReportCategory) => {
  const api = useReportApi();
  const initialFilterBy = category
    ? { category: { equalTo: category } }
    : undefined;
  const initialListParameters = {
    initialSortBy: { key: 'name' },
    initialFilterBy,
  };
  const { filterBy, queryParams, sortBy, offset } = useQueryParams(
    initialListParameters
  );

  return useQuery(
    api.keys.paramList(queryParams),
    async () => api.get.list({ filterBy, sortBy, offset }),
    {
      onError: (e: Error) => {
        if (/HasPermission\(Report\)/.test(e.message)) return null;
        return [];
      },
    }
  );
};

type PrintReportParams = {
  reportId: string;
  dataId: string;
};

export const usePrintReport = () => {
  const api = useReportApi();
  const { error } = useNotification();
  const { mutate, isLoading } = useMutation<
    string,
    Error,
    PrintReportParams,
    unknown
  >(params => api.get.print(params), {
    onSuccess: fileId => {
      if (!fileId) throw new Error('Error printing report');
      const url = `${Environment.FILE_URL}${fileId}`;
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        // win.print(); // crashes chrome if the file is a PDF :shrug:
      }
    },
    onError: e => {
      error(e.message)();
    },
  });

  return { print: mutate, isPrinting: isLoading };
};
