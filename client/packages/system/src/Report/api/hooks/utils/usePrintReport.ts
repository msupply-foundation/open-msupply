import {
  EnvUtils,
  getNativeAPI,
  PrintFormat,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useReportApi } from './useReportApi';

type PrintReportParams = {
  reportId: string;
  dataId: string;
};

const setClose = (frame: HTMLIFrameElement) => () => {
  document.body.removeChild(frame);
};

const setPrint = (frame: HTMLIFrameElement) => () => {
  const { contentWindow } = frame;
  if (contentWindow) {
    contentWindow.onbeforeunload = setClose(frame);
    contentWindow.onafterprint = setClose(frame);
    contentWindow.focus(); // Required for IE
    contentWindow.print();
  }
};

const printPage = (url: string) => {
  fetch(url).then(async response => {
    const html = await response.text();
    const nativeAPI = getNativeAPI();

    if (!nativeAPI?.print(html)) {
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.onload = setPrint(frame);
      frame.srcdoc = html;
      document.body.appendChild(frame);
    }
  });
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
      if (EnvUtils.printFormat === PrintFormat.Html) {
        printPage(url);
      } else {
        const win = window.open(url, '_blank');
        win?.focus();
      }
    },
    onError: e => {
      error(e.message)();
    },
  });

  return { print: mutate, isPrinting: isLoading };
};
