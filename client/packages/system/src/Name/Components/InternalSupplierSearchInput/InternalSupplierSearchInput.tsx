import React, { FC } from 'react';
import {
  Autocomplete,
  RegexUtils,
  useBufferState,
} from '@openmsupply-client/common';
import { NameRowFragment, useInternalSuppliers } from '../../api';
import {
  basicFilterOptions,
  NameSearchInputProps,
  simpleNameOptionRenderer,
} from '../../utils';

export const InternalSupplierSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = useInternalSuppliers();
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={simpleNameOptionRenderer}
      getOptionLabel={(option: NameRowFragment) => option.name}
      filterOptions={(options, state) =>
        options.filter(option =>
          RegexUtils.matchNameOrCode(option, state.inputValue)
        )
      }
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      autoWidthPopper
    />
  );
};
