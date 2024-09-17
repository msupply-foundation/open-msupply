import React, { createContext, PropsWithChildren, useContext } from 'react';
import { RecordWithId } from '@common/types';
import { QueryParamsProvider, QueryParamsState } from '@common/hooks';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { AppSxProp } from '../../../../styles';

export interface RowState {
  isSelected: boolean;
  isExpanded: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  index: number;
  style?: AppSxProp;
}

type FocusDirection = 'up' | 'down';
export interface TableStore {
  rowState: Record<string, RowState>;
  numberSelected: number;
  numberExpanded: number;
  isGrouped: boolean;

  toggleExpanded: (id: string) => void;
  toggleAllExpanded: () => void;
  toggleSelected: (id: string) => void;
  toggleAll: () => void;
  setRows: (id: string[]) => void;
  setDisabledRows: (id: string[]) => void;
  setIsGrouped: (grouped: boolean) => void;
  setFocus: (dir: FocusDirection) => void;
  setRowStyle: (id: string, style: AppSxProp) => void;
  setRowStyles: (
    ids: string[],
    style: AppSxProp,
    shouldReset?: boolean
  ) => void;
}

export const tableContext = createContext<UseBoundStore<StoreApi<TableStore>>>(
  {} as UseBoundStore<StoreApi<TableStore>>
);

export const TableProvider = <T extends RecordWithId>({
  children,
  createStore,
  queryParamsStore,
}: PropsWithChildren<{
  createStore: () => UseBoundStore<StoreApi<TableStore>>;
  queryParamsStore?: UseBoundStore<StoreApi<QueryParamsState<T>>>;
}>) => {
  const { Provider } = tableContext;
  const store = React.useMemo(createStore, [createStore]);
  return queryParamsStore ? (
    <Provider value={store}>
      <QueryParamsProvider createStore={queryParamsStore}>
        {children}
      </QueryParamsProvider>
    </Provider>
  ) : (
    <Provider value={store}>{children}</Provider>
  );
};

export function useTableStore<T = TableStore>(
  selectorFn?: (state: TableStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const store = useContext(tableContext);
  const storeWithoutSelector = useStoreWithEqualityFn(store) as unknown as T;
  const selector = selectorFn ?? ((_: TableStore) => storeWithoutSelector);

  return useStoreWithEqualityFn(store, selector, equalityFn) as unknown as T;
}

const getRowState = (
  state: TableStore,
  id: string,
  updates: Partial<RowState>
): RowState => ({
  isSelected: state.rowState[id]?.isSelected ?? false,
  isExpanded: state.rowState[id]?.isExpanded ?? false,
  isDisabled: state.rowState[id]?.isDisabled ?? false,
  isFocused: state.rowState[id]?.isFocused ?? false,
  index: state.rowState[id]?.index ?? 0,
  style: state.rowState[id]?.style ?? {},
  ...updates,
});

export const createTableStore = () =>
  create<TableStore>(set => ({
    rowState: {},
    numberSelected: 0,
    numberExpanded: 0,
    isGrouped: false,

    toggleAll: () => {
      set(state => {
        const rowIds = Object.keys(state.rowState);
        const numberOfRows = rowIds.length;
        const isSelected = state.numberSelected !== numberOfRows;
        const numberSelected = isSelected ? numberOfRows : 0;

        return {
          ...state,
          numberSelected,
          rowState: Object.keys(state.rowState).reduce(
            (newState, id) => ({
              ...newState,
              [id]: {
                ...state.rowState[id],
                isSelected,
                isExpanded: state.rowState[id]?.isExpanded ?? false,
                isDisabled: state.rowState[id]?.isDisabled ?? false,
                isFocused: state.rowState[id]?.isFocused ?? false,
                index: state.rowState[id]?.index ?? 0,
              },
            }),
            state.rowState
          ),
        };
      });
    },
    setRowStyle: (id, style) => {
      set(state => ({
        ...state,
        rowState: {
          ...state.rowState,
          [id]: getRowState(state, id, { style }),
        },
      }));
    },
    setRowStyles: (ids: string[], style: AppSxProp, shouldReset = true) => {
      set(state => {
        const { rowState } = state;

        // Reset all styles within the state.
        if (shouldReset)
          Object.keys(rowState).forEach(id => {
            rowState[id] = getRowState(state, id, { style: {} });
          });

        // Set new styles for the ids passed.
        ids.forEach(id => {
          rowState[id] = getRowState(state, id, { style });
        });

        return { ...state, rowState: { ...rowState } };
      });
    },

    setDisabledRows: (ids: string[]) => {
      set(state => {
        const { rowState } = state;

        // Reset the disabled row states.
        Object.keys(rowState).forEach(id => {
          rowState[id] = getRowState(state, id, { isDisabled: false });
        });

        // then set the disabled row state for all of the rows passed in.
        ids.forEach(id => {
          rowState[id] = getRowState(state, id, { isDisabled: true });
        });

        return { ...state, rowState: { ...rowState } };
      });
    },

    setRows: (ids: string[]) => {
      set(state => {
        // Create a new row state, which is setting any newly active rows to unselected and unfocused.
        const newRowState: Record<string, RowState> = ids.reduce(
          (newRowState, id, index) => {
            return {
              ...newRowState,
              [id]: getRowState(state, id, {
                isExpanded: false,
                isFocused: false,
                index,
              }),
            };
          },
          {}
        );

        const numberSelected = Object.values(newRowState).filter(
          ({ isSelected }) => isSelected
        ).length;

        return {
          ...state,
          numberSelected,
          numberExpanded: 0,
          rowState: newRowState,
        };
      });
    },

    setIsGrouped: (grouped: boolean) => {
      set(state => {
        return {
          ...state,
          isGrouped: grouped,
        };
      });
    },

    setFocus: direction => {
      set(state => {
        const { rowState } = state;
        const rows = Object.entries(rowState);

        // Get currently focused row, if any
        const [currentFocusId, currentFocusObj] =
          rows.find(([, { isFocused }]) => isFocused === true) || [];

        // Deduce what the next row is, wrapping around if reaching top/bottom
        const nextIndex =
          direction === 'down'
            ? ((currentFocusObj?.index ?? -1) + 1) % rows.length
            : ((currentFocusObj?.index ?? rows.length) - 1 + rows.length) %
              rows.length;
        const [nextId] =
          rows.find(([, { index }]) => index === nextIndex) || [];

        // Set / Unset focus state
        if (currentFocusId)
          rowState[currentFocusId] = getRowState(state, currentFocusId, {
            isFocused: false,
          });
        rowState[nextId as string] = getRowState(state, nextId as string, {
          isFocused: true,
        });

        return { ...state, rowState: { ...rowState } };
      });
    },

    toggleSelected: (id: string) => {
      set(state => {
        const { numberSelected, rowState } = state;

        // How many rows in total are currently rendered to determine
        // if all rows, some or none are selected.
        const isSelected = !rowState[id]?.isSelected;

        // If this row is being toggled on, add one, otherwise reduce the number
        // of rows selected.
        const newNumberSelected = numberSelected + (isSelected ? 1 : -1);

        return {
          ...state,
          numberSelected: newNumberSelected,
          rowState: {
            ...state.rowState,
            [id]: getRowState(state, id, { isSelected }),
          },
        };
      });
    },

    toggleExpanded: (id: string) => {
      set(state => {
        const { numberExpanded, rowState } = state;

        const isExpanded = !rowState[id]?.isExpanded;
        const newNumberExpanded = numberExpanded + (isExpanded ? 1 : -1);

        return {
          ...state,
          numberExpanded: newNumberExpanded,
          rowState: {
            ...rowState,
            [id]: getRowState(state, id, { isExpanded }),
          },
        };
      });
    },

    toggleAllExpanded: () => {
      set(state => {
        const rowIds = Object.keys(state.rowState);
        const numberOfRows = rowIds.length;
        const isExpanded = state.numberExpanded !== numberOfRows;
        const numberExpanded = isExpanded ? numberOfRows : 0;

        return {
          ...state,
          numberExpanded,
          rowState: Object.keys(state.rowState).reduce(
            (newState, id) => ({
              ...newState,
              [id]: getRowState(state, id, { isExpanded }),
            }),
            state.rowState
          ),
        };
      });
    },
  }));
