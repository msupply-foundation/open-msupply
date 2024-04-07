import {
  EnvUtils,
  Platform,
  PrintFormat,
  PrintReportSortInput,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useReportApi } from './useReportApi';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { JsonData } from '@openmsupply-client/programs';

type PrintReportParams = {
  reportId: string;
  dataId?: string;
  args?: JsonData;
  sort?: PrintReportSortInput;
};

const setClose = (frame: HTMLIFrameElement) => () => {
  document.body.removeChild(frame);
};

const print = (frame: HTMLIFrameElement) => {
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

    if (EnvUtils.platform === Platform.Android) {
      Printer.print({ content: html });
    } else {
      const frame = document.createElement('iframe');
      frame.hidden = true;
      frame.onload = () => {
        if (frame.contentDocument)
          frame.contentDocument.documentElement.innerHTML = html;

        // Wait till images are loaded. There seem to be no callback for this and its hard to check
        // if everything is loaded correctly for unknown html. For this reason, just wait a small
        // amount of time.
        // Note, while developing, even a timeout of 0ms worked but it has been raised o 30ms to
        // have some buffer.
        setTimeout(() => {
          print(frame);
        }, 30);
      };
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
