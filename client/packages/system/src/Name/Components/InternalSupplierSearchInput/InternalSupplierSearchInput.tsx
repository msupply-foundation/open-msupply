import React, { FC } from 'react';
import {
  Autocomplete,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  useBufferState,
  Typography,
} from '@openmsupply-client/common';
import { useInternalSuppliers, NameRowFragment } from '../../api';

const filterOptions = {
  stringify: (name: NameRowFragment) => `${name.code} ${name.name}`,
  limit: 100,
};

interface InternalSupplierSearchInputProps {
  onChange: (name: NameRowFragment) => void;
  width?: number;
  value: NameRowFragment | null;
  disabled?: boolean;
}

const optionRenderer: AutocompleteOptionRenderer<NameRowFragment> = (
  props,
  item
) => (
  <DefaultAutocompleteItemOption {...props}>
    <Typography sx={{ marginInlineEnd: '10px', fontWeight: 'bold', width: 75 }}>
      {item.code}
    </Typography>
    <Typography>{item.name}</Typography>
  </DefaultAutocompleteItemOption>
);

export const InternalSupplierSearchInput: FC<
  InternalSupplierSearchInputProps
> = ({ onChange, width = 250, value, disabled = false }) => {
  const { data, isLoading } = useInternalSuppliers();
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={filterOptions}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={optionRenderer}
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      autoWidthPopper
    />
  );
};
