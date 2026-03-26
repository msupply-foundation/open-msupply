import {
  EnvUtils,
  Platform,
  PrintFormat,
  PrintReportSortInput,
  ReportTemplateType,
  useDownloadFile,
  useIntlUtils,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { JsonData } from '@openmsupply-client/programs';
import { useReportGraphQL } from '../useReportGraphQL';

export type GenerateReportParams = {
  reportId: string;
  dataId?: string;
  args?: JsonData;
  sort?: PrintReportSortInput;
  format?: PrintFormat;
  templateType?: ReportTemplateType;
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

const printPdf = (url: string) => {
  // Open PDF in a new tab — the browser's native PDF viewer
  // provides its own print button and better rendering than an iframe
  window.open(url, '_blank');
};

const printHtml = (html: string) => {
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
};

const printPage = (url: string) => {
  fetch(url).then(async response => {
    // Detect if the server returned a PDF (e.g. Typst reports always produce PDF)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('pdf')) {
      printPdf(url);
      return;
    }
    const html = await response.text();
    // Also detect PDF by magic bytes in case content-type header is missing
    if (html.startsWith('%PDF')) {
      printPdf(url);
      return;
    }
    printHtml(html);
  });
};

export const usePrintReport = () => {
  const t = useTranslation();
  const { reportApi, storeId } = useReportGraphQL();
  const { error } = useNotification();
  const { currentLanguage } = useIntlUtils();
  const downloadFile = useDownloadFile();

  const mutationFn = async (params: GenerateReportParams) => {
    const { dataId, reportId, args, sort, format, templateType } = params;

    // Determine the server-side format:
    // - If caller specified a format (e.g. Excel button), use it
    //   but for Typst + Excel, request HTML instead (for testing)
    // - Default: Tera→HTML, Typst→PDF
    let serverFormat = format;
    if (!serverFormat) {
      serverFormat =
        templateType === ReportTemplateType.Typst
          ? PrintFormat.Pdf
          : PrintFormat.Html;
    } else if (
      serverFormat === PrintFormat.Excel &&
      templateType === ReportTemplateType.Typst
    ) {
      serverFormat = PrintFormat.Html;
    }

    const result = await reportApi.generateReport({
      dataId,
      reportId,
      storeId,
      format: serverFormat,
      arguments: args,
      sort,
      currentLanguage,
    });
    if (result?.generateReport?.__typename === 'PrintReportNode') {
      return result.generateReport.fileId;
    }

    throw new Error(t('messages.error-printing-report'));
  };

  const { mutate, mutateAsync, isLoading } = useMutation({
    mutationFn,
    onSuccess: (fileId, { format, templateType }) => {
      if (!fileId) throw new Error(t('messages.error-printing-report'));
      const url = `${Environment.FILE_URL}${fileId}`;

      // Excel button on Typst reports → open HTML in new tab
      if (
        format === PrintFormat.Excel &&
        templateType === ReportTemplateType.Typst
      ) {
        window.open(url, '_blank');
        return;
      }

      // Excel → download
      if (format === PrintFormat.Excel) {
        downloadFile(url);
        return;
      }

      // PDF / Typst default → open in new tab
      if (
        format === PrintFormat.Pdf ||
        templateType === ReportTemplateType.Typst
      ) {
        printPdf(url);
        return;
      }

      // Tera HTML → iframe print dialog
      printPage(url);
    },
    onError: (e: Error) => {
      error(e.message)();
    },
  });

  return { print: mutate, printAsync: mutateAsync, isPrinting: isLoading };
};
