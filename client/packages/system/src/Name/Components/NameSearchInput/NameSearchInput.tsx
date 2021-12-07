import React, { FC } from 'react';
import { Name } from '@openmsupply-client/common';
import {
  Autocomplete,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@common/components';
import { useNames } from '../../hooks';

const filterOptions = {
  stringify: (name: Name) => `${name.code} ${name.name}`,
  limit: 100,
};

interface NameSearchInputProps {
  onChange: (name: Name) => void;
  width?: number;
  value: Name | null;
  disabled?: boolean;
  type: 'customer' | 'supplier';
}

export const NameSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  type,
}) => {
  const isCustomerLookup = type === 'customer';
  const filter = isCustomerLookup ? { isCustomer: true } : { isSupplier: true };
  const { data, isLoading } = useNames(filter);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        value && {
          ...value,
          label: value.name,
        }
      }
      filterOptionConfig={filterOptions}
      loading={isLoading}
      onChange={(_, name) => name && onChange(name)}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      renderOption={getDefaultOptionRenderer('name')}
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
