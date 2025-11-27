import {
  useDownloadFile,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useReportGraphQL } from '../useReportGraphQL';

export type CsvToExcelParams = {
  csvData: string;
  filename: string;
};

export const useCsvToExcel = () => {
  const t = useTranslation();
  const { reportApi, storeId } = useReportGraphQL();
  const { error } = useNotification();
  const downloadFile = useDownloadFile();

  const mutationFn = async (params: CsvToExcelParams) => {
    const { csvData, filename } = params;

    const result = await reportApi.csvToExcel({
      storeId,
      csvData,
      filename,
    });

    if (result?.csvToExcel?.__typename === 'PrintReportNode') {
      return result.csvToExcel.fileId;
    }

    const errorMessage =
      result?.csvToExcel?.__typename === 'PrintReportError'
        ? result.csvToExcel.error.description
        : t('messages.error-converting-csv-to-excel');

    throw new Error(errorMessage);
  };

  const { mutate, mutateAsync, isLoading } = useMutation({
    mutationFn,
    onSuccess: fileId => {
      if (!fileId) {
        throw new Error(t('messages.error-converting-csv-to-excel'));
      }
      const url = `${Environment.FILE_URL}${fileId}`;
      downloadFile(url);
    },
    onError: (e: Error) => {
      error(e.message)();
    },
  });

  return {
    convertCsvToExcel: mutate,
    convertCsvToExcelAsync: mutateAsync,
    isConverting: isLoading,
  };
};
