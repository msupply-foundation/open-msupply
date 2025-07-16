import React from 'react';
import { RnRFormLineFragment } from '../operations.generated';
import {
  create,
  RecordWithId,
  ViewportListRef,
} from '@openmsupply-client/common';
import keyBy from 'lodash/keyBy';
import mapValues from 'lodash/mapValues';
import { itemMatchesSearch } from '../../utils';
import { isLineError } from '../../DetailView/helpers';

type SetLine = (line: RecordWithId & Partial<RnRFormLineFragment>) => void;
interface RnRFormContext {
  listRef?: React.RefObject<ViewportListRef>;
  rnrFormId: string;
  foundIds: { [id: string]: boolean };
  baseLines: { [id: string]: RnRFormLineFragment };
  baseLineIndexes: { [id: string]: number };
  draftLines: Record<
    string,
    RecordWithId & Partial<RnRFormLineFragment> & { isDirty?: boolean }
  >;
  draftLineIteration: Record<string, number>;
  setDraftLine: SetLine;
  clearAllDirtyLines: () => void;
  getAllDirtyLines: (ignoreError?: boolean) => RnRFormLineFragment[];
  setInitial: (rnrFormId: string, _: RnRFormLineFragment[]) => void;
  setListRef: (_: React.RefObject<ViewportListRef>) => void;
  scrollToIndex: (_: number) => void;
  search: (_: string) => number;
  resetSearch: () => void;
}

export const useRnRFormContext = create<RnRFormContext>((set, get) => ({
  listRef: undefined,
  foundIds: {},
  baseLines: {},
  baseLineIndexes: {},
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
      baseLineIndexes: mapValues(
        keyBy(
          baseLines.map(({ id }, index) => ({ id, index })),
          'id'
        ),
        ({ index }) => index
      ),
      rnrFormId,
      draftLines: {},
      draftLineIteration: {},
    }));
  },
  getAllDirtyLines: (ignoreError = true) => {
    const { baseLines, draftLines } = get();
    return Object.values(draftLines).flatMap(draftLine => {
      if (!draftLine.isDirty || (ignoreError && isLineError(draftLine)))
        return [];
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
  setListRef: listRef => set(state => ({ ...state, listRef })),
  scrollToIndex: index =>
    get().listRef?.current?.scrollToIndex({
      alignToTop: false,
      // load 2 lines below the found line
      index: index + 2,
    }),
  resetSearch: () => set(state => ({ ...state, foundIds: {} })),
  search: term => {
    let numberOfMatches = 0;
    const found = Object.values(get().baseLines).filter(l => {
      if (numberOfMatches > 10) return false;

      if (itemMatchesSearch(term, l.item)) {
        numberOfMatches++;
        return true;
      } else {
        return false;
      }
    });
    const first = found[0];
    if (!first) {
      set(state => ({ ...state, foundIds: {} }));
      return -1;
    }

    set(state => ({
      ...state,
      foundIds: mapValues(keyBy(found, 'id'), () => true),
    }));

    return get().baseLineIndexes[first.id] || -1;
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

export function useOneTime<S, U>(selector: (state: S) => U): (state: S) => U {
  const once = React.useRef<U | undefined>(undefined);
  return state => {
    const next = selector(state);
    return !!once.current ? (once.current as U) : (once.current = next);
  };
}

export const useErrorLineIndex = (state: RnRFormContext) => {
  const firstErrorLine = Object.values(state.baseLines).find(line => {
    const draftLine = state.draftLines[line.id];

    return draftLine
      ? // If there is draft line, that's the latest state, check if that has an error
        isLineError(draftLine)
      : // otherwise check the base line wasn't in error state to start with
        isLineError(line);
  });

  if (!firstErrorLine) return -1;
  return state.baseLineIndexes[firstErrorLine.id] || -1;
};

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

    const highlight = state.foundIds[id] || false;

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
