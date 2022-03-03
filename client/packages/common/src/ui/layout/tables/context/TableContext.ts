import create, { UseStore } from 'zustand';
import createContext from 'zustand/context';
import { AppSxProp } from '../../../../styles';

export interface RowState {
  isSelected: boolean;
  isExpanded: boolean;
  isDisabled: boolean;
  style?: AppSxProp;
}

export interface TableStore {
  rowState: Record<string, RowState>;
  numberSelected: number;
  numberExpanded: number;
  isGrouped: boolean;

  toggleExpanded: (id: string) => void;
  toggleAllExpanded: () => void;
  toggleSelected: (id: string) => void;
  toggleAll: () => void;
  setActiveRows: (id: string[]) => void;
  setDisabledRows: (id: string[]) => void;
  setIsGrouped: (grouped: boolean) => void;
  setRowStyle: (id: string, style: AppSxProp) => void;
  setRowStyles: (ids: string[], style: AppSxProp) => void;
}

export const { Provider: TableProvider, useStore: useTableStore } =
  createContext<TableStore>();

const getRowState = (
  state: TableStore,
  id: string,
  updates: Partial<RowState>
): RowState => ({
  isSelected: state.rowState[id]?.isSelected ?? false,
  isExpanded: state.rowState[id]?.isExpanded ?? false,
  isDisabled: state.rowState[id]?.isDisabled ?? false,
  style: state.rowState[id]?.style ?? {},
  ...updates,
});

export const createTableStore = (): UseStore<TableStore> =>
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
    setRowStyles: (ids: string[], style: AppSxProp) => {
      set(state => {
        const { rowState } = state;

        // Reset all styles within the state.
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

    setActiveRows: (ids: string[]) => {
      set(state => {
        // Create a new row state, which is setting any newly active rows to unselected.
        const newRowState: Record<string, RowState> = ids.reduce(
          (newRowState, id) => {
            return {
              ...newRowState,
              [id]: getRowState(state, id, { isExpanded: false }),
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
