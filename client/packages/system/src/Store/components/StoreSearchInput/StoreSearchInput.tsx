import React from 'react';
import { StoreRowFragment, useStore } from '../../api';
import {
  Autocomplete,
  AutocompleteProps,
  createQueryParamsStore,
  defaultOptionMapper,
  QueryParamsProvider,
} from '@openmsupply-client/common';

type StoreSearchInputProps = {
  renderInput: AutocompleteProps<StoreRowFragment>['renderInput'];
  isDisabled?: boolean;
  onChange: (newStore: StoreRowFragment) => void;
  value?: StoreRowFragment;
};

const StoreSearchComponent = ({
  renderInput,
  isDisabled = false,
  onChange,
  value,
}: StoreSearchInputProps) => {
  const { data, isLoading } = useStore.document.list();

  return (
    <Autocomplete
      clearable={false}
      renderInput={renderInput}
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
    createStore={() =>
      createQueryParamsStore<StoreRowFragment>({
        initialSortBy: { key: 'code' },
      })
    }
  >
    <StoreSearchComponent {...props} />
  </QueryParamsProvider>
);
