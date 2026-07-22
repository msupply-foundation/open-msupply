// The reports vertical's record-screen surface (spec/reports S4): the
// "Select a form" dialog and its supporting resource/generate wrapper. Host
// verticals import SelectReportModal and render their own Export/Print trigger
// (spec: "their surfaces name the trigger, this vertical owns the dialog"). The
// generated-file plumbing it builds on lives in domain/reportFiles.
export { SelectReportModal } from './SelectReportModal';
export type { SelectReportModalProps } from './SelectReportModal';
export { listReportsByContext } from './reportsResource';
export type { Report, ReportContext } from './reportsResource';
export { generateReport } from './generateReport';
export type {
  GenerateReportParams,
  PrintFormat,
  ReportSort,
} from './generateReport';
export { reportLabel } from './reportLabel';
