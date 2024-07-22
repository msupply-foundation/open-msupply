import { create } from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';

interface ReportStoreState {
  id: string;
  setId: (id: string) => void;
  args: Map<string, JsonData | undefined>;
  setArgs: (id: string, value: JsonData | undefined) => void;
}

export const useReportStore = create<ReportStoreState>(set => ({
  id: '',
  setId: (id: string) => set(state => ({ ...state, id })),
  args: new Map(),
  setArgs: (id: string, value: JsonData | undefined) =>
    set(state => {
      const args = new Map(state.args);
      args.set(id, value);
      return { ...state, args };
    }),
}));
