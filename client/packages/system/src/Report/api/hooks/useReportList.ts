import {
  useQuery,
  ReportContext,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
  useIntlUtils,
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

  const {
    filterBy,
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    offset,
  } = queryParams ?? {};

  const queryKey = [REPORT, storeId, LIST, sortBy, filterBy, offset];
  const queryFn = async (): Promise<{
    nodes: ReportRowFragment[];
    totalCount: number;
  }> => {
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
    } else {
      throw new Error('Could not translate reports');
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
