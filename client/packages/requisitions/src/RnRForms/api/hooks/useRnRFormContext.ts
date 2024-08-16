import { RnRFormLineFragment } from '../operations.generated';
import { create } from '@openmsupply-client/common';

interface RnRFormContext {
  dirtyLines: Record<string, RnRFormLineFragment>;
  setDraftLine: (line: RnRFormLineFragment) => void;
  clearDirtyLine: (id: string) => void;
  clearAllDirty: () => void;
}

export const useRnRFormContext = create<RnRFormContext>(set => ({
  dirtyLines: {},

  setDraftLine: (line: RnRFormLineFragment) =>
    set(state => ({
      ...state,
      dirtyLines: { ...state.dirtyLines, [line.id]: line },
    })),
  clearDirtyLine: id =>
    set(state => {
      const { [id]: _, ...dirtyLines } = state.dirtyLines;
      return {
        ...state,
        dirtyLines,
      };
    }),
  clearAllDirty: () => set(state => ({ ...state, dirtyLines: {} })),
}));
