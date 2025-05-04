import React from 'react';
import { RnRFormLineFragment } from '../operations.generated';
import { create, RecordWithId } from '@openmsupply-client/common';
import { shallow } from 'zustand/shallow';
import mapValues from 'lodash/mapValues';

interface RnRFormContext {
  draftLines: Record<
    string,
    Partial<RnRFormLineFragment> & { isDirty: boolean }
  >;
  draftLineIteration: Record<string, number>;
  setDraftLine: (line: RecordWithId & Partial<RnRFormLineFragment>) => void;
  clearDraftLine: (id: string) => void;
  clearAllDraftLines: () => void;
}

export const useRnRFormContext = create<RnRFormContext>(set => ({
  draftLines: {},
  draftLineIteration: {},

  setDraftLine: line => {
    set(state => ({
      ...state,
      draftLines: {
        ...state.draftLines,
        [line.id]: { ...line, isDirty: true },
      },
      draftLineIteration: {
        ...state.draftLineIteration,
        [line.id]: (state.draftLineIteration[line.id] ?? 0) + 1,
      },
    }));
  },
  clearDraftLine: id =>
    set(state => {
      const newDraftLine = {
        ...(state.draftLines[id] || {}),
        isDirty: false,
        confirmed: true,
      };
      return {
        ...state,
        draftLines: { ...state.draftLines, [id]: newDraftLine },
        draftLineIteration: {
          ...state.draftLineIteration,
          [id]: (state.draftLineIteration[id] ?? 0) + 1,
        },
      };
    }),
  clearAllDraftLines: () =>
    set(state => ({
      ...state,
      draftLines: mapValues(state.draftLines, line => ({
        ...line,
        isDirty: false,
        confirmed: true,
      })),
    })),
}));

export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = React.useRef<U | undefined>(undefined);
  return state => {
    const next = selector(state);
    return shallow(prev.current, next)
      ? (prev.current as U)
      : (prev.current = next);
  };
}

export function useRnRDraftLine<U>(
  id: string,
  selector: (state: RnRFormContext) => U
): (state: RnRFormContext) => U {
  const prevIteration = React.useRef(-1);
  const prev = React.useRef<U | undefined>(undefined);

  return state => {
    const next = selector(state);
    const previousIteration = prevIteration.current;
    prevIteration.current = state.draftLineIteration[id] ?? 0;

    return previousIteration == (state.draftLineIteration[id] ?? 0)
      ? (prev.current as U)
      : (prev.current = next);
  };
}
