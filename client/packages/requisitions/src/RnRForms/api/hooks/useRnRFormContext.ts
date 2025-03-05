import { RnRFormLineFragment } from '../operations.generated';
import { create } from '@openmsupply-client/common';

interface RnRFormContext {
  draftLines: Record<string, RnRFormLineFragment>;
  setDraftLine: (line: RnRFormLineFragment) => void;
  clearDraftLine: (id: string) => void;
  clearAllDraftLines: () => void;
}

export const useRnRFormContext = create<RnRFormContext>(set => ({
  draftLines: {},

  setDraftLine: (line: RnRFormLineFragment) =>
    set(state => ({
      ...state,
      draftLines: { ...state.draftLines, [line.id]: line },
    })),
  clearDraftLine: id =>
    set(state => {
      const { [id]: _, ...draftLines } = state.draftLines;
      return {
        ...state,
        draftLines,
      };
    }),
  clearAllDraftLines: () => set(state => ({ ...state, draftLines: {} })),
}));
