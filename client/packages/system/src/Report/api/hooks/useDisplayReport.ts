import { PrintFormat } from '@common/types';
import { useReportGraphQL } from '../useReportGraphQL';
import { PrintReportParams } from './usePrintReport';
import { useQuery } from '@openmsupply-client/common';
import { DISPLAY, REPORT } from './keys';
export const useDisplayReport = (params: PrintReportParams) => {
  const { reportApi, storeId } = useReportGraphQL();

  const queryKey = [REPORT, storeId, DISPLAY];
  const queryFn = async () => {
    const { dataId, reportId, args, sort } = params;
    const result = await reportApi.printReport({
      dataId,
      reportId,
      storeId,
      format: PrintFormat.Html,
      arguments: args,
      sort,
    });
    if (result?.printReport?.__typename === 'PrintReportNode') {
      return result.printReport.fileId;
    }

    return null;
  };

  return useQuery({
    queryKey,
    queryFn,
  });
};
