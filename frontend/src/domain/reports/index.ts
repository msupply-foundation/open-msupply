// The reports vertical's record-screen surface (spec/reports S4): the
// "Select a form" dialog and its supporting resource/generate wrapper. Host
// verticals mount ExportPrintButton — the trigger plus this dialog — naming
// only their report context and record. The
// generated-file plumbing it builds on lives in domain/reportFiles.
export { SelectReportModal } from './SelectReportModal';
export {
  ExportPrintButton,
  type ExportPrintButtonProps,
} from './ExportPrintButton';
export type { SelectReportModalProps } from './SelectReportModal';
export { listReportsByContext } from './reportsResource';
export type {
  Report,
  ReportContext,
  ReportsExtraFilter,
} from './reportsResource';
export { generateReport } from './generateReport';
export type {
  GenerateReportParams,
  PrintFormat,
  ReportSort,
} from './generateReport';
export { reportLabel } from './reportLabel';
