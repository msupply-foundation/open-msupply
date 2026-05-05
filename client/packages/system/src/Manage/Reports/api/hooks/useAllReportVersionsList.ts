import {
  useQuery,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
  useIntlUtils,
  useTranslation,
  useNotification,
  LIST_KEY,
  useMutation,
  keepPreviousData,
  isEnumValue,
} from '@openmsupply-client/common';
import { ALLREPORTVERSIONS } from './keys';
import { ReportRowFragment } from '@openmsupply-client/system/src/Report/index.js';
import { useAllReportVersionsGraphQL as useCentralServerReportsGraphqQL } from '../../api/useReportsGraphQL';

export interface ReportListParams {
  filterBy: ReportFilterInput | null;
  sortBy?: SortBy<ReportRowFragment>;
  first?: number;
  offset?: number;
}

export const useCentralReports = ({
  queryParams,
}: {
  queryParams?: ReportListParams;
}) => {
  // QUERY
  const { data, isError, isFetching } = useGetList(queryParams);

  // INSTALL
  const {
    mutateAsync: installMutation,
    isPending: installLoading,
    error: installError,
  } = useInstallUploadedReports();

  return {
    query: { data, isFetching, isError },
    install: { installMutation, installLoading, installError },
  };
};

const useGetList = (queryParams?: ReportListParams) => {
  const t = useTranslation();
  const { reportApi, storeId } = useCentralServerReportsGraphqQL();
  const { currentLanguage: language } = useIntlUtils();
  const { error } = useNotification();

  const {
    filterBy,
    sortBy = {
      key: 'code',
      direction: 'asc',
    },
    offset,
    first,
  } = queryParams ?? {};
  const queryKey = [
    ALLREPORTVERSIONS,
    storeId,
    LIST_KEY,
    sortBy,
    filterBy,
    offset,
    first,
  ];

  const queryFn = async () => {
    try {
      const query = await reportApi.allReportVersions({
        filter: {
          ...filterBy,
        },
        key: isEnumValue(ReportSortFieldInput, sortBy.key)
          ? sortBy.key
          : ReportSortFieldInput.Code,
        desc: sortBy.isDesc,
        storeId,
        userLanguage: language,
        first,
        offset,
      });

      if (query?.allReportVersions?.__typename == 'ReportConnector') {
        return {
          nodes: query.allReportVersions.nodes,
          totalCount: query.allReportVersions.totalCount,
        };
      }
      if (query?.allReportVersions.__typename == 'QueryReportsError') {
        let errorMessage;
        switch (query.allReportVersions.error.__typename) {
          case 'FailedTranslation':
            errorMessage = t('report.error-translating', {
              key: query.allReportVersions.error.description,
            });
            break;
        }
        error(errorMessage)();
        console.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });
};

const useInstallUploadedReports = () => {
  const { reportApi, queryClient } = useCentralServerReportsGraphqQL();

  const mutationFn = async (fileId: string) => {
    const result = await reportApi.installUploadedReports({ fileId });
    return result?.centralServer?.reports.installUploadedReports;
  };

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [ALLREPORTVERSIONS]
    }),
    onError: e => console.error(e),
  });

  return mutation;
};
