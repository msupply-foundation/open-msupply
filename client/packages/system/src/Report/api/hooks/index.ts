import { Document } from './document';
import { Utils } from './utils';

export const useReport = {
  document: { list: Document.useReports },
  utils: {
    api: Utils.useReportApi,
    print: Utils.usePrintReport,
  },
};
