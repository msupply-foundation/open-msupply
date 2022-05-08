import create, { SetState, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { RecordWithId } from '@common/types';
import {
  usePagination,
  PaginationState,
  PaginationController,
} from '../usePagination';
import {
  useSortBy,
  SortState,
  SortRule,
  SortController,
  SortBy,
} from '../useSortBy';
import {
  useFilterBy,
  FilterState,
  FilterBy,
  FilterController,
  FilterByConditionByType,
} from '../useFilterBy';
import { Column } from '../../ui';

export interface QueryParams<T extends RecordWithId>
  extends SortState<T>,
    FilterState,
    PaginationState {}

export interface QueryParamsState<T extends RecordWithId>
  extends SortState<T>,
    FilterState,
    PaginationState {
  pagination: PaginationState;
  sort: SortState<T>;
  filter: FilterState;
  queryParams: QueryParams<T>;
}

export const useQueryParams = <T extends RecordWithId>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy;
}): QueryParamsState<T> => {
  const filter = useFilterBy(initialFilterBy);
  const sort = useSortBy(initialSortBy);
  const pagination = usePagination();

  const queryParams: QueryParams<T> = {
    ...pagination,
    ...filter,
    ...sort,
    filter,
    sort,
    pagination,
  };

  return {
    ...pagination,
    ...sort,
    ...filter,
    sort,
    filter,
    pagination,
    queryParams,
  };
};

export interface QueryParamsStateNew<T extends RecordWithId> {
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

export const { Provider: QueryParamsProvider, useStore: useQueryParamsStore } =
  createContext<QueryParamsStateNew<any>>();

export const createQueryParamsStore = <T extends RecordWithId>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy;
}): UseBoundStore<QueryParamsStateNew<T>> => {
  const setFilterBy =
    (set: SetState<QueryParamsStateNew<T>>) => (newFilterBy: FilterBy) =>
      set(state => {
        const { filterBy: previousFilterBy, ...rest } = { ...state.filter };
        const filterBy = { ...previousFilterBy, ...newFilterBy };
        return { ...state, filter: { ...rest, filterBy } };
      });

  return create<QueryParamsStateNew<T>>((set, get) => ({
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
        key: 'initialSortBy.key',
        isDesc: initialSortBy.isDesc ?? false,
        direction: getDirection(initialSortBy.isDesc ?? false),
      },
      onChangeSortBy: (column: Column<T>) => {
        let sortBy = { key: '', direction: 'asc' } as SortBy<T>;
        set(state => {
          const { key, sortBy: { isDesc: maybeNewIsDesc } = {} } = column;
          const { sort } = state;
          const isDesc =
            sort.sortBy.key === key
              ? !sort.sortBy.isDesc
              : !!maybeNewIsDesc ?? false;

          sortBy = {
            ...sort.sortBy,
            key,
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
        value: Date
      ) => {
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

const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
  isDesc ? 'desc' : 'asc';
