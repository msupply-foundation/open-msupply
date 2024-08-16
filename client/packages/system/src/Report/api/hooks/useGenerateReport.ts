import { PrintFormat } from '@common/types';
import { useReportGraphQL } from '../useReportGraphQL';
import { GenerateReportParams } from './usePrintReport';
import { useMutation } from '@openmsupply-client/common';

export const useGenerateReport = () => {
  const { reportApi, storeId } = useReportGraphQL();

  const mutationFn = async (params: GenerateReportParams) => {
    const { dataId, reportId, args, sort, format = PrintFormat.Html } = params;

    const result = await reportApi.generateReport({
      dataId,
      reportId,
      storeId,
      format,
      arguments: args,
      sort,
    });
    return result?.generateReport;
  };

  const { mutateAsync, isLoading } = useMutation({
    mutationFn,
  });

  return { mutateAsync, isLoading };
};
