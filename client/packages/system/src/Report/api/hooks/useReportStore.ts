import { create } from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';

interface ReportStoreState {
  id: string;
  setId: (reportId: string) => void;
  name: string;
  setName: (name: string) => void;
  args: JsonData | undefined;
  setArgs: (args: JsonData | undefined) => void;
}

export const useReportStore = create<ReportStoreState>(set => ({
  id: '',
  setId: (id: string) => set(state => ({ ...state, id })),
  name: '',
  setName: (name: string) => set(state => ({ ...state, name })),
  args: undefined,
  setArgs: (args: JsonData | undefined) => set(state => ({ ...state, args })),
}));
