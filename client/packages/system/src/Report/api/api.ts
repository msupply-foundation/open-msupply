import { FilterBy, SortBy } from '@openmsupply-client/common';
import { ReportRowFragment, Sdk } from './operations.generated';

export type ReportListParams = {
  filterBy: FilterBy | null;
  sortBy: SortBy<ReportRowFragment>;
  offset: number;
};

export const getReportQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ filterBy, sortBy }: ReportListParams) => {
      const result = await sdk.reports({
        filter: filterBy,
        key: sortBy.key,
        desc: sortBy.isDesc,
        storeId,
      });

      return result?.reports || [];
    },
    print: async ({
      dataId,
      reportId,
    }: {
      dataId: string;
      reportId: string;
    }) => {
      const result = await sdk.printReport({
        dataId,
        reportId,
        storeId,
      });
      if (result?.printReport.__typename === 'PrintReportNode') {
        return result.printReport.fileId;
      }

      throw new Error('Unable to print report');
    },
  },
});
