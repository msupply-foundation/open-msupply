import React from 'react';
import { StoreRowFragment, usePaginatedStores } from '../../api';
import {
  AutocompleteWithPagination,
  createQueryParamsStore,
  QueryParamsProvider,
  RegexUtils,
  useDebounceCallback,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { StoreOptionRender } from './StoreOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;
const RECORDS_PER_PAGE = 100;

type StoreSearchInputProps = {
  clearable?: boolean;
  fullWidth?: boolean;
  isDisabled?: boolean;
  value?: StoreRowFragment;
  onPageChange?: (page: number) => void;
  onChange: (newStore: StoreRowFragment) => void;
  onInputChange: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
};

const filterByNameAndCode = (options: StoreRowFragment[], state: any) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, [
      'storeName',
      'code',
    ])
  );

const StoreSearchComponent = ({
  clearable = false,
  fullWidth = false,
  isDisabled = false,
  value,
  onChange,
  onInputChange,
}: StoreSearchInputProps) => {
  const { filter } = useQueryParamsStore();

  const { data, isFetching, fetchNextPage } = usePaginatedStores({
    rowsPerPage: RECORDS_PER_PAGE,
    filter,
  });

  const pageNumber = data?.pages?.length
    ? (data.pages[data.pages.length - 1]?.pageNumber ?? 0)
    : 0;

  const debounceOnFilter = useDebounceCallback(
    (searchText: string) => {
      filter.onChangeStringFilterRule('name', 'like', searchText);
    },
    [],
    DEBOUNCE_TIMEOUT
  );

  return (
    <AutocompleteWithPagination
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={RECORDS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      width={fullWidth ? '100%' : undefined}
      sx={fullWidth ? { width: '100%' } : undefined}
      filterOptions={filterByNameAndCode}
      clearable={clearable}
      loading={isFetching}
      getOptionLabel={option => `${option.code} ${option.storeName}`}
      renderOption={StoreOptionRender}
      disabled={isDisabled}
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.storeName, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
      onInputChange={(event, value, reason) => {
        if (event?.type === 'change') debounceOnFilter(value);
        onInputChange(event, value, reason);
      }}
    />
  );
};

export const StoreSearchInput = (props: StoreSearchInputProps) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<StoreRowFragment>({
      initialSortBy: { key: 'name' },
      initialRowsPerPage: RECORDS_PER_PAGE,
    })}
  >
    <StoreSearchComponent {...props} />
  </QueryParamsProvider>
);
