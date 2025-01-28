import React from 'react';
import { StoreRowFragment, useStore } from '../../api';
import {
  Autocomplete,
  createQueryParamsStore,
  defaultOptionMapper,
  QueryParamsProvider,
} from '@openmsupply-client/common';

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
      clearable={clearable}
      loading={isLoading}
      options={defaultOptionMapper(data?.nodes ?? [], 'code')}
      disabled={isDisabled}
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.code, ...value } : null}
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
