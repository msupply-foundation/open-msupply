import { useMutation, useNotification } from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useReportApi } from './useReportApi';

type PrintReportParams = {
  reportId: string;
  dataId: string;
};

export const usePrintReport = () => {
  const api = useReportApi();
  const { error } = useNotification();
  const { mutate, isLoading } = useMutation<
    string,
    Error,
    PrintReportParams,
    unknown
  >(params => api.get.print(params), {
    onSuccess: fileId => {
      if (!fileId) throw new Error('Error printing report');
      const url = `${Environment.FILE_URL}${fileId}`;
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        // win.print(); // crashes chrome if the file is a PDF :shrug:
      }
    },
    onError: e => {
      error(e.message)();
    },
  });

  return { print: mutate, isPrinting: isLoading };
};
