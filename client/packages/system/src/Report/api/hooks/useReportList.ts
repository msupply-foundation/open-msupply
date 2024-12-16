import {
  useQuery,
  ReportContext,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
  useIntlUtils,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { ReportRowFragment } from '../operations.generated';
import { useReportGraphQL } from '../useReportGraphQL';
import { LIST, REPORT } from './keys';

export type ReportListParams = {
  filterBy: ReportFilterInput | null;
  sortBy?: SortBy<ReportRowFragment>;
  offset?: number;
};

export const useReportList = ({
  context,
  subContext,
  queryParams,
}: {
  context?: ReportContext;
  subContext?: string;
  queryParams?: ReportListParams;
}) => {
  const { reportApi, storeId } = useReportGraphQL();
  const { currentLanguage: language } = useIntlUtils();
  const { error } = useNotification();
  const t = useTranslation();

  const {
    filterBy,
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    offset,
  } = queryParams ?? {};

  const queryKey = [REPORT, storeId, LIST, sortBy, filterBy, offset];
  const queryFn = async () => {
    try {
      const query = await reportApi.reports({
        filter: {
          ...filterBy,
          ...(context ? { context: { equalTo: context } } : null),
          ...(subContext ? { subContext: { equalTo: subContext } } : null),
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
