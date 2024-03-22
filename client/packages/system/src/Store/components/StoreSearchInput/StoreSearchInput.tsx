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
  isDisabled = false,
  value,
  onInputChange,
  onChange,
}: StoreSearchInputProps) => {
  const { data, isLoading } = useStore.document.list();

  return (
    <Autocomplete
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
