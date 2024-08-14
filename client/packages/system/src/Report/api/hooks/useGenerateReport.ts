import { Dispatch, SetStateAction } from 'react';
import { PrintFormat } from '@common/types';
import { useReportGraphQL } from '../useReportGraphQL';
import { GenerateReportParams } from './usePrintReport';
import {
  LocaleKey,
  noOtherVariants,
  TypedTFunction,
  useMutation,
} from '@openmsupply-client/common';

export const useGenerateReport = (
  setErrorMessage: Dispatch<SetStateAction<string>>,
  t: TypedTFunction<LocaleKey>
) => {
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

    if (result?.generateReport?.__typename === 'PrintReportError') {
      const err = result?.generateReport.error;

      if (err.__typename === 'FailedToFetchReportData') {
        const errors = err.errors;

        if (errors[0].extensions?.details?.includes('permission')) {
          setErrorMessage(t('error.no-permission-report'));
        } else {
          setErrorMessage(t('error.failed-to-generate-report'));
        }
      } else {
        noOtherVariants;
      }
    }

    throw new Error(t('error.failed-to-generate-report'));
  };

  const { mutateAsync, isLoading } = useMutation({
    mutationFn,
  });

  return { mutateAsync, isLoading };
};
