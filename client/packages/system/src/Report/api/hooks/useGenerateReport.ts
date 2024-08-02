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
    if (result?.generateReport?.__typename === 'PrintReportNode') {
      return result.generateReport.fileId;
    }

    throw new Error('Unable to generate report');
  };

  const { mutateAsync, isLoading } = useMutation({
    mutationFn,
    onSuccess: fileId => {
      if (!fileId) throw new Error('Error generating report');
    },
  });

  return { mutateAsync, isLoading };
};
