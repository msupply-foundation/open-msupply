import React, { FC, useMemo } from 'react';
import { Name, useBufferState } from '@openmsupply-client/common';
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
  onlyShowStores?: boolean;
  type: 'customer' | 'supplier';
}

export const NameSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  type,
  onlyShowStores,
}) => {
  const isCustomerLookup = type === 'customer';
  const filter = isCustomerLookup ? { isCustomer: true } : { isSupplier: true };
  const { data, isLoading } = useNames(filter);
  const [buffer, setBuffer] = useBufferState(value);

  const filteredData = useMemo(() => {
    if (onlyShowStores) return data?.nodes.filter(({ store }) => !!store) ?? [];
    else return data?.nodes ?? [];
  }, [data, onlyShowStores]);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        buffer && {
          ...buffer,
          label: buffer.name,
        }
      }
      filterOptionConfig={filterOptions}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={defaultOptionMapper(filteredData, 'name')}
      renderOption={getDefaultOptionRenderer('name')}
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      autoWidthPopper
    />
  );
};
