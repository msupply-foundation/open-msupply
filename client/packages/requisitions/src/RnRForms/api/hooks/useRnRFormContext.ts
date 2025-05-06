import React from 'react';
import { RnRFormLineFragment } from '../operations.generated';
import { create, RecordWithId } from '@openmsupply-client/common';
import keyBy from 'lodash/keyBy';
import mapValues from 'lodash/mapValues';
import { itemMatchesSearch } from '../../utils';

type SetLine = (line: RecordWithId & Partial<RnRFormLineFragment>) => void;
interface RnRFormContext {
  rnrFormId: string;
  search: string;
  baseLines: { [id: string]: RnRFormLineFragment };
  draftLines: Record<
    string,
    RecordWithId & Partial<RnRFormLineFragment> & { isDirty?: boolean }
  >;
  draftLineIteration: Record<string, number>;
  setDraftLine: SetLine;
  setSearch: (search: string) => void;
  clearAllDirtyLines: () => void;
  getAllDirtyLines: () => RnRFormLineFragment[];
  setInitial: (rnrFormId: string, _: RnRFormLineFragment[]) => void;
  hasUnconfirmedLines: () => boolean;
  confirmUnconfirmedLines: () => void;
}

export const useRnRFormContext = create<RnRFormContext>((set, get) => ({
  search: '',
  baseLines: {},
  draftLines: {},
  draftLineIteration: {},
  rnrFormId: '',
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
  setSearch: search => {
    set(state => ({
      ...state,
      search,
    }));
  },
  clearAllDirtyLines: () =>
    set(state => ({
      ...state,
      draftLines: mapValues(state.draftLines, line => ({
        ...line,
        isDirty: false,
      })),
      draftLineIteration: mapValues(
        state.draftLineIteration,
        value => value + 1
      ),
    })),
  setInitial: (rnrFormId, baseLines) => {
    set(state => ({
      ...state,
      baseLines: keyBy(baseLines, 'id'),
      rnrFormId,
      draftLines: {},
      draftLineIteration: {},
    }));
  },
  getAllDirtyLines: () => {
    const { baseLines, draftLines } = get();
    return Object.values(draftLines).flatMap(draftLine => {
      if (!draftLine.isDirty) return [];
      const baseLine = baseLines[draftLine.id];
      if (!baseLine) return [];

      return [{ ...baseLine, ...draftLine }];
    });
  },
  hasUnconfirmedLines: () => {
    const { baseLines, draftLines } = get();
    return Object.values(baseLines).some(baseLine => {
      const draftLine = draftLines[baseLine.id];

      if (!draftLine) return !baseLine.confirmed;
      if ('confirmed' in draftLine) return !draftLine.confirmed;

      return baseLine.confirmed;
    });
  },
  confirmUnconfirmedLines: () => {
    const { baseLines, draftLines } = get();
    const toBeConfirmed = Object.values(baseLines).flatMap(baseLine => {
      const draftLine = draftLines[baseLine.id] || { id: baseLine.id };
      const line = { ...baseLine, ...draftLine };
      if (!line.confirmed)
        return [{ ...draftLine, confirmed: true, isDirty: true }];

      return [];
    });

    const toBeConfirmedById = keyBy(toBeConfirmed, 'id');
    set(state => ({
      ...state,
      draftLines: { ...state.draftLines, ...toBeConfirmedById },
      draftLineIteration: {
        ...state.draftLineIteration,
        ...mapValues(
          toBeConfirmedById,
          ({ id }) => (state.draftLineIteration[id] || 0) + 1
        ),
      },
    }));
  },
}));

export const useRnRDraft = (id: string) => {
  const prevIteration = React.useRef(-1);
  const prev = React.useRef<RnRFormLineFragment | undefined>(undefined);

  return (state: RnRFormContext) => {
    const previousIteration = prevIteration.current;
    prevIteration.current = state.draftLineIteration[id] ?? 0;

    const baseLine = state.baseLines[id];

    if (!baseLine) return undefined;

    return previousIteration == (state.draftLineIteration[id] ?? 0)
      ? prev.current
      : (prev.current = { ...baseLine, ...(state.draftLines[id] || {}) });
  };
};

// export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
//   const prev = React.useRef<U | undefined>(undefined);
//   return state => {
//     const next = selector(state);
//     return shallow(prev.current, next)
//       ? (prev.current as U)
//       : (prev.current = next);
//   };
// }

export const useCachedRnRDraftLine = (id: string) => {
  const prevIteration = React.useRef(-1);
  const prev = React.useRef<
    | {
        line: RnRFormLineFragment & { isDirty?: boolean };
        setLine: SetLine;
        highlight: boolean;
      }
    | undefined
  >(undefined);

  return (state: RnRFormContext) => {
    const previousIteration = prevIteration.current;
    prevIteration.current = state.draftLineIteration[id] ?? 0;

    const baseLine = state.baseLines[id];
    if (!baseLine) return undefined;

    const line = { ...baseLine, ...(state.draftLines[id] || {}) };

    const highlight =
      !!state.search && itemMatchesSearch(state.search, line.item);

    const shouldUpdate =
      previousIteration !== (state.draftLineIteration[id] ?? 0) ||
      prev.current?.highlight !== highlight;

    return shouldUpdate
      ? (prev.current = {
          line,
          setLine: state.setDraftLine,
          highlight,
        })
      : prev.current;
  };
};
