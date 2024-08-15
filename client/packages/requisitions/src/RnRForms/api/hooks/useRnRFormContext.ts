import { RnRFormNodeStatus } from '@common/types';
import { RnRFormLineFragment } from '../operations.generated';
import { ArrayUtils, create } from '@openmsupply-client/common';

export interface RnRForm {
  id: string;
  periodLength: number;
  periodName: string;
  status: RnRFormNodeStatus;
  lineIds: string[];
}

export interface RnRFormLine extends RnRFormLineFragment {
  isDirty?: boolean;
  error?: string;
}

interface RnRFormContext {
  isLoading: boolean;
  form: RnRForm | undefined;
  lines: Record<string, RnRFormLine>;
  setForm: (form: RnRForm) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLine: (line: RnRFormLine) => void;
  setLines: (lines: RnRFormLineFragment[]) => void;
  setError: (lineId: string, error: string) => void;
}

export const useRnRFormContext = create<RnRFormContext>(set => ({
  isLoading: true,
  form: undefined,
  lines: {},
  setForm: (form: RnRForm) =>
    set(state => ({ ...state, form, isLoading: false })),
  setIsLoading: (isLoading: boolean) => set(state => ({ ...state, isLoading })),
  setLine: (line: RnRFormLine) =>
    set(state => ({
      ...state,
      lines: { ...state.lines, [line.id]: line },
    })),
  setLines: (lines: RnRFormLineFragment[]) =>
    set(state => ({ ...state, lines: ArrayUtils.toObject(lines) })),
  setError: (lineId: string, error: string) =>
    set(state => {
      const line = state.lines[lineId];
      if (line === undefined) return state;
      return {
        ...state,
        lines: {
          ...state.lines,
          [lineId]: { ...line, error },
        },
      };
    }),
}));
