import { EnvUtils, FilterBy, SortBy } from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';
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
      reportId,
      dataId,
      args,
    }: {
      reportId: string;
      dataId: string | undefined;
      args: JsonData | undefined;
    }) => {
      const format = EnvUtils.printFormat;
      const result = await sdk.printReport({
        dataId,
        reportId,
        storeId,
        format,
        arguments: args,
      });
      if (result?.printReport.__typename === 'PrintReportNode') {
        return result.printReport.fileId;
      }

      throw new Error('Unable to print report');
    },
  },
});
