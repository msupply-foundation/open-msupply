import {
  useQuery,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
  useIntlUtils,
  useTranslation,
  useNotification,
  LIST_KEY,
} from '@openmsupply-client/common';
import {  ALLREPORTVERSIONS } from './keys';
import { ReportRowFragment } from 'packages/system/src/Report/index.js';
import { useAllReportVersionsGraphQL } from '../api/useReportsGraphQL';

export type ReportListParams = {
  filterBy: ReportFilterInput | null;
  sortBy?: SortBy<ReportRowFragment>;
  first?: number;
  offset?: number;
};

export const useAllReportVersionsList = ({
  queryParams,
}: {
  queryParams?: ReportListParams;
}) => {

    // QUERY

    const { data, isLoading, isError } = useGetList(queryParams);

    return {
        query: {data, isLoading, isError},
    };
};

const useGetList = (queryParams?: ReportListParams) => {
    const { reportApi, storeId } = useAllReportVersionsGraphQL();
    
    const { currentLanguage: language } = useIntlUtils();
  const { error } = useNotification();
  const t = useTranslation();

  const {
    filterBy,
    sortBy = {
      key: 'code',
      direction: 'asc',
    },
    offset,
    first,
  } = queryParams ?? {};
    const queryKey = [ALLREPORTVERSIONS, storeId, LIST_KEY, sortBy, filterBy, offset, first];

  const queryFn = async () => {
    try {
      const query = await reportApi.allReportVersions({
        filter: {
          ...filterBy,
          isActive: true,
        },
        key: sortBy.key as ReportSortFieldInput,
        desc: sortBy.isDesc,
        storeId,
        userLanguage: language,
      });

      if (query?.reports?.__typename == 'ReportConnector') {
        return {
          nodes: query.reports.nodes,
          totalCount: query.reports.totalCount,
        };
      }
      if (query?.reports.__typename == 'QueryReportsError') {
        let errorMessage;
        switch (query.reports.error.__typename) {
          case 'FailedTranslation':
            errorMessage = t('report.error-translating', {
              key: query.reports.error.description,
            });
            break;
          // TODO add never exhaustive error handling if adding more error types to QueryReportError
          // default:
          //   noOtherVariants(query.reports.error.__typename);
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
    onError: (e: Error) => {
      if (/HasPermission\(Report\)/.test(e.message)) return null;
      return [];
    },
  });
};
