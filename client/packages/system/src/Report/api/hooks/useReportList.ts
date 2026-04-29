import {
  useQuery,
  ReportContext,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
  useIntlUtils,
  useTranslation,
  useNotification,
  isEnumValue,
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
  silentOnPermissionDenied = false,
}: {
  context?: ReportContext;
  subContext?: string;
  queryParams?: ReportListParams;
  /** Set when used as a background widget (e.g. ReportSelector on detail
   * pages) so a permission-denied response doesn't pop a modal — the
   * surrounding page is the user's primary signal. */
  silentOnPermissionDenied?: boolean;
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
    const query = await reportApi.reports({
      filter: {
        ...filterBy,
        ...(context ? { context: { equalTo: context } } : null),
        ...(subContext ? { subContext: { equalTo: subContext } } : null),
        isActive: true,
      },
      key: isEnumValue(ReportSortFieldInput, sortBy.key)
        ? sortBy.key
        : ReportSortFieldInput.Name,
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
      // Domain error returned as a union variant — surface as a toast
      // and treat as empty data; not the same as a transport/auth
      // error, which should bubble to isError on the query.
      // TODO add never exhaustive error handling if adding more error types to QueryReportError
      let errorMessage;
      switch (query.reports.error.__typename) {
        case 'FailedTranslation':
          errorMessage = t('report.error-translating', {
            key: query.reports.error.description,
          });
          break;
      }
      error(errorMessage)();
      console.error(errorMessage);
      return { nodes: [], totalCount: 0 };
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    // Spread so we don't pass `onError: undefined` and override the
    // QueryClient default (which routes everything to a toast/modal).
    ...(silentOnPermissionDenied ? { onError: () => {} } : {}),
  });
};
