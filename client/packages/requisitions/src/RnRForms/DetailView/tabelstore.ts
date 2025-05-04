import pick from 'lodash/pick';
import React from 'react';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = React.useRef<U | undefined>(undefined);
  return state => {
    const next = selector(state);
    return shallow(prev.current, next)
      ? (prev.current as U)
      : (prev.current = next);
  };
}

export type ElementType<T extends ReadonlyArray<unknown>> =
  T extends ReadonlyArray<infer ElementType> ? ElementType : never;
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

export const createDataStore = <Data, IdField extends keyof Data>(
  idKey: IdField
) => {
  type State = {
    data: Data[];
    checkedIds: { [id: string]: boolean };
    dataIdIndex: { [id: string]: number };
    patchById: { [id: string]: Partial<Data> };
    setData: (_: Data[]) => void;
    setPartial: (id: string, value: Partial<Data>) => void;
    toggleChecked: (id: string) => void;
  };

  const getRow = ({ data, dataIdIndex, patchById }: State, id: string) => {
    const index = dataIdIndex[id];
    if (index === undefined) return undefined;
    const row = data[index];
    if (!row) return undefined;
    const patchRow = patchById[id] || {};
    return { ...row, ...patchRow };
  };

  const useData = create<State>(set => ({
    data: [],
    dataIdIndex: {},
    checkedIds: {},
    patchById: {},
    setData: data =>
      set(state => ({
        ...state,
        data,
        dataIdIndex: data.reduce(
          (acc, row, index) => ({ ...acc, [String(row[idKey])]: index }),
          {}
        ),
      })),
    setPartial: (id, value) => {
      set(state => ({
        ...state,
        patchById: {
          ...state.patchById,
          [id]: { ...(state.patchById[id] || {}), ...value },
        },
      }));
    },
    toggleChecked: id => {
      set(state => ({
        ...state,
        checkedIds: { ...state.checkedIds, [id]: !state.checkedIds[id] },
      }));
    },
  }));

  const usePartialDataRow = <K extends (keyof Data)[]>(
    id: string,
    keys: K
  ): [undefined | Pick<Data, ElementType<K>>, State['setPartial']] => {
    const row = useData(
      useShallow(state => {
        let row = getRow(state, id);

        return row && pick(row, keys);
      })
    );
    const set = useData(useShallow(state => state.setPartial));
    return [row, set];
  };

  const usePartialDataField = <K extends keyof Data>(
    id: string,
    key: K
  ): [undefined | Data[K], State['setPartial']] =>
    useData(
      useShallow(state => {
        let row = getRow(state, id);
        return [row && row[key], state.setPartial];
      })
    );

  const useToggle = (id: string): [boolean, (id: string) => void] =>
    useData(
      useShallow(state => {
        return [state?.checkedIds[id] || false, state.toggleChecked];
      })
    );

  const useIds = () =>
    useData(useShallow(state => state.data.map(row => row[idKey])));

  return {
    useData,
    usePartialDataRow,
    usePartialDataField,
    useIds,
    useToggle,
    useSetData: () => useData(useShallow(state => state.setData)),
  };
};
