import React, { ReactNode, createContext, useContext } from 'react';
import { create, StoreApi } from 'zustand';
import { RecordWithId } from '@common/types';
import {
  FilterBy,
  FilterController,
  FilterByConditionByType,
  PaginationController,
  SortRule,
  SortController,
  SortBy,
} from './types';

export interface QueryParamsState<T extends RecordWithId> {
  pagination: PaginationController;
  sort: SortController<T>;
  filter: FilterController;
  paramList: () => {
    first: number;
    offset: number;
    sortBy: SortBy<T>;
    filterBy: FilterBy | null;
  };
}
const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
  isDesc ? 'desc' : 'asc';

const queryParamsStoreContext = createContext<QueryParamsState<any>>({} as any);

export const createQueryParamsStore = <T extends RecordWithId>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy;
}) => {
  const setFilterBy =
    (set: StoreApi<QueryParamsState<T>>['setState']) =>
    (newFilterBy: FilterBy) =>
      set(state => {
        const { filterBy: previousFilterBy, ...rest } = { ...state.filter };
        const filterBy = { ...previousFilterBy, ...newFilterBy };
        return { ...state, filter: { ...rest, filterBy } };
      });

  return create<QueryParamsState<T>>((set, get) => ({
    pagination: {
      first: 20,
      offset: 0,
      page: 0,
      onChangeFirst: (first: number) => {
        set(state => {
          const { page, ...rest } = state.pagination;
          return {
            ...state,
            pagination: { ...rest, first, offset: page * first, page },
          };
        });
      },
      onChangePage: (page: number) => {
        set(state => {
          const { first, ...rest } = state.pagination;
          return {
            ...state,
            pagination: { ...rest, first, offset: page * first, page },
          };
        });
      },
      nextPage: () => {
        set(state => {
          const { first, page: currentPage, ...rest } = state.pagination;
          const page = currentPage + 1;
          return {
            ...state,
            pagination: { ...rest, first, offset: page * first, page },
          };
        });
      },
    },
    sort: {
      sortBy: {
        key: initialSortBy.key,
        isDesc: initialSortBy.isDesc ?? false,
        direction: getDirection(initialSortBy.isDesc ?? false),
      },
      onChangeSortBy: (sortKey: string, sortDir: 'desc' | 'asc') => {
        let sortBy = { key: '', direction: 'asc' } as SortBy<T>;
        set(state => {
          const { sort } = state;
          const isDesc = sortDir === 'desc';
          sortBy = {
            ...sort.sortBy,
            key: sortKey,
            isDesc,
            direction: getDirection(isDesc),
          };
          return { ...state, sort: { ...sort, sortBy } };
        });
        return sortBy;
      },
    },
    filter: {
      filterBy: initialFilterBy ?? null,
      onChangeStringFilterRule: (
        key: string,
        condition: FilterByConditionByType['string'],
        value: string
      ) => {
        if (value === '') {
          get().filter.onClearFilterRule(key);
        } else {
          setFilterBy(set)({ [key]: { [condition]: value } });
        }
      },

      onChangeDateFilterRule: (
        key: string,
        condition: FilterByConditionByType['date'],
        value: Date | Date[]
      ) => {
        if (value === null) {
          get().filter.onClearFilterRule(key);
          return;
        }
        if (Array.isArray(value)) {
          const betweenDates = {
            afterOrEqualTo: value[0],
            beforeOrEqualTo: value[1],
          };
          setFilterBy(set)({ [key]: betweenDates });
          return;
        }
        setFilterBy(set)({ [key]: { [condition]: value } });
      },

      onClearFilterRule: (key: string) =>
        set(state => {
          const { filterBy: previousFilterBy, ...rest } = { ...state.filter };
          const filterBy = { ...previousFilterBy };
          delete filterBy[key];
          return { ...state, filter: { ...rest, filterBy } };
        }),
    },
    paramList: () => {
      const { pagination, sort, filter } = get();
      return {
        first: pagination.first,
        offset: pagination.offset,
        sortBy: sort.sortBy,
        filterBy: filter.filterBy,
      };
    },
  }));
};

export const QueryParamsProvider = ({
  children,
  createStore,
}: {
  children: ReactNode;
  createStore: () => QueryParamsState<any>;
}) => {
  const { Provider } = queryParamsStoreContext;
  const store = createStore();
  return <Provider value={store}>{children}</Provider>;
};

export const useQueryParamsStore = () => useContext(queryParamsStoreContext);
