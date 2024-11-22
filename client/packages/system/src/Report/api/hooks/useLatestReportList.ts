import {
  useQuery,
  ReportContext,
  SortBy,
  ReportSortFieldInput,
  ReportFilterInput,
} from '@openmsupply-client/common';
import { ReportRowFragment } from '../operations.generated';
import { useReportGraphQL } from '../useReportGraphQL';
import { LIST, REPORT } from './keys';
const appVersion = require('../../../../../../../package.json').version;

export type LatestReportListParams = {
  filterBy: ReportFilterInput | null;
  sortBy?: SortBy<ReportRowFragment>;
  offset?: number;
};

const compareVersions = (version1: String, version2: String) => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;

    if (v1 > v2) return 1;
    if (v1 < v2) return -1;
  }
  return 0;
};

export const useLatestReportList = ({
  context,
  subContext,
  queryParams,
}: {
  context?: ReportContext;
  subContext?: string;
  queryParams?: LatestReportListParams;
}) => {
  const { reportApi, storeId } = useReportGraphQL();
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
    });

    const reportMap = new Map();
    const nodes = query.reports.nodes;
    nodes.forEach(node => {
      const existing = reportMap.get(node.code);

      if (!existing && compareVersions(appVersion, node.version) >= 0) {
        reportMap.set(node.code, node);
      } else if (
        node.isCustom &&
        !existing.isCustom &&
        compareVersions(appVersion, node.version) >= 0
      ) {
        reportMap.set(node.code, node);
      } else if (node.isCustom && existing.isCustom) {
        if (
          compareVersions(node.version, existing.version) > 0 &&
          compareVersions(appVersion, node.version) >= 0
        ) {
          reportMap.set(node.code, node);
        }
      } else if (!node.isCustom && !existing.isCustom) {
        if (
          compareVersions(node.version, existing.version) > 0 &&
          compareVersions(appVersion, node.version) >= 0
        ) {
          reportMap.set(node.code, node);
        }
      }
    });

    const filteredNodes = Array.from(reportMap.values());

    return {
      nodes: filteredNodes,
      totalCount: filteredNodes.length,
    };
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
