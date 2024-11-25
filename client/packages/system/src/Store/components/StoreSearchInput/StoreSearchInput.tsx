import React, { useEffect } from 'react';
import { StoreRowFragment, useStore } from '../../api';
import {
  ArrayUtils,
  AutocompleteWithPagination,
  createQueryParamsStore,
  QueryParamsProvider,
  RegexUtils,
  usePagination,
} from '@openmsupply-client/common';
import { StoreOptionRender } from './StoreOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;

type StoreSearchInputProps = {
  clearable?: boolean;
  fullWidth?: boolean;
  isDisabled?: boolean;
  value?: StoreRowFragment;
  onPageChange?: (page: number) => void;
  onChange: (newStore: StoreRowFragment) => void;
  onInputChange?: (
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
  const { pagination, onPageChange } = usePagination(30);

  const { data, isFetching, fetchNextPage } =
    useStore.document.list(pagination);

  const options = ArrayUtils.flatMap(data?.pages, page => page?.nodes ?? []);

  // when the pagination changes, fetch the next page
  useEffect(() => {
    console.log(
      'stores:',
      'first:',
      pagination.first,
      'offset:',
      pagination.offset,
      'page:',
      pagination.page,
      'options:',
      options
    );
    fetchNextPage({ pageParam: pagination.page });
  }, [fetchNextPage, pagination.page]);

  return (
    <AutocompleteWithPagination
      width={fullWidth ? '100%' : undefined}
      sx={fullWidth ? { width: '100%' } : undefined}
      filterOptions={filterByNameAndCode}
      clearable={clearable}
      loading={isFetching}
      // options={mapStores(options)}
      options={options}
      getOptionLabel={option => `${option.code} ${option.storeName}`}
      renderOption={StoreOptionRender}
      disabled={isDisabled}
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.storeName, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      pagination={{ ...pagination, total: data?.pages?.[0]?.totalCount ?? 0 }}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={onPageChange}
      onInputChange={onInputChange}
    />
  );
};

export const StoreSearchInput = (props: StoreSearchInputProps) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<StoreRowFragment>({
      initialSortBy: { key: 'code' },
    })}
  >
    <StoreSearchComponent {...props} />
  </QueryParamsProvider>
);
