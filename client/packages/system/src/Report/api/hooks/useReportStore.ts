import { create } from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';
import { ReportRowFragment } from '../operations.generated';

interface ReportStoreState {
  report: ReportRowFragment;
  setReport: (report: ReportRowFragment) => void;
  args: JsonData | undefined;
  setArgs: (args: JsonData | undefined) => void;
}

export const useReportStore = create<ReportStoreState>(set => ({
  report: {} as ReportRowFragment,
  setReport: (report: ReportRowFragment) =>
    set(state => ({ ...state, report })),
  args: undefined,
  setArgs: (args: JsonData | undefined) => set(state => ({ ...state, args })),
}));
