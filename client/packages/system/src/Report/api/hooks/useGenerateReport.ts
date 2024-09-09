import { PrintFormat } from '@common/types';
import { useReportGraphQL } from '../useReportGraphQL';
import { GenerateReportParams } from './usePrintReport';
import { useMutation } from '@openmsupply-client/common';
import { useIntlUtils } from '@common/intl';

export const useGenerateReport = () => {
  const { reportApi, storeId } = useReportGraphQL();

  const mutationFn = async (params: GenerateReportParams) => {
    const { dataId, reportId, args, sort, format = PrintFormat.Html } = params;
    const {currentLanguage} = useIntlUtils();

    const result = await reportApi.generateReport({
      dataId,
      reportId,
      storeId,
      format,
      arguments: args,
      sort,
      currentLanguage,
    });
    return result?.generateReport;
  };

  const { mutateAsync, isLoading } = useMutation({
    mutationFn,
  });

  return { mutateAsync, isLoading };
};
