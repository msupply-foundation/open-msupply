import React, { FC } from 'react';
import {
  Autocomplete,
  Name,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@openmsupply-client/common';
import { useCustomers } from '../../hooks';

const filterOptions = {
  stringify: (name: Name) => `${name.code} ${name.name}`,
  limit: 100,
};

interface CustomerSearchProps {
  onChange: (name: Name) => void;
  width?: number;
  value: Name;
  disabled?: boolean;
}

export const CustomerSearchInput: FC<CustomerSearchProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = useCustomers();

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={{
        ...value,
        label: value.name,
      }}
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
