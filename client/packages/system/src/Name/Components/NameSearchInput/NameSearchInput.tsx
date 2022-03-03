import React, { FC, useMemo } from 'react';
import { useBufferState } from '@openmsupply-client/common';
import {
  Autocomplete,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@common/components';
import { useNamesSearch, NameRowFragment } from '../../api';

const filterOptions = {
  stringify: (name: NameRowFragment) => `${name.code} ${name.name}`,
  limit: 100,
};

interface NameSearchInputProps {
  onChange: (name: NameRowFragment) => void;
  width?: number;
  value: NameRowFragment | null;
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
  const { data, isLoading } = useNamesSearch(filter);
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
