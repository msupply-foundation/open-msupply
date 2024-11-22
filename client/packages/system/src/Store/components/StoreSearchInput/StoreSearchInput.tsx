import React from 'react';
import { StoreRowFragment, useStore } from '../../api';
import {
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
}: StoreSearchInputProps) => {
  const { pagination, onPageChange } = usePagination();

  const { data, isLoading } = useStore.document.list(
    pagination.first,
    pagination.offset
  );

  return (
    <AutocompleteWithPagination
      width={fullWidth ? '100%' : undefined}
      sx={fullWidth ? { width: '100%' } : undefined}
      filterOptions={filterByNameAndCode}
      clearable={clearable}
      loading={isLoading}
      options={data?.nodes ?? []}
      getOptionLabel={option => `${option.code} ${option.storeName}`}
      renderOption={StoreOptionRender}
      disabled={isDisabled}
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.storeName, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={onPageChange}
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
