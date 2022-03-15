import { StoreRowFragment, useStores } from '../../api';
import React from 'react';
import {
  Autocomplete,
  AutocompleteProps,
  defaultOptionMapper,
} from '@openmsupply-client/common';

type StoreSearchInputProps = {
  renderInput: AutocompleteProps<StoreRowFragment>['renderInput'];
  isDisabled?: boolean;
  onChange: (newStore: StoreRowFragment) => void;
  value?: StoreRowFragment;
};

export const StoreSearchInput = ({
  renderInput,
  isDisabled = false,
  onChange,
  value,
}: StoreSearchInputProps) => {
  const { data, isLoading } = useStores();

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
