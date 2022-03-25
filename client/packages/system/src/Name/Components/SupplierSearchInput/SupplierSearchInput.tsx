import React, { FC } from 'react';
import { Autocomplete, useBufferState } from '@openmsupply-client/common';
import { useSuppliers } from '../../api';
import {
  basicFilterOptions,
  filterByNameAndCode,
  NameSearchInputProps,
} from '../../utils';
import { NameOptionRenderer } from '../NameOptionRenderer';

export const SupplierSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = useSuppliers();
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      filterOptions={filterByNameAndCode}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={NameOptionRenderer}
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      autoWidthPopper
    />
  );
};
