import React from 'react';
import { StoreRowFragment, useStore } from '../../api';
import {
  Autocomplete,
  createQueryParamsStore,
  QueryParamsProvider,
  RegexUtils,
} from '@openmsupply-client/common';
import { StoreOptionRender } from './StoreOptionRenderer';

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
  onInputChange,
  onChange,
}: StoreSearchInputProps) => {
  const { data, isLoading } = useStore.document.list();

  return (
    <Autocomplete
      width={fullWidth ? '100%' : undefined}
      sx={fullWidth ? { width: '100%' } : undefined}
      onInputChange={onInputChange}
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
