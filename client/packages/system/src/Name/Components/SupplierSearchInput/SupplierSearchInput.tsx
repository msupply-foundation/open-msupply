import React, { FC } from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Autocomplete,
  useBufferState,
} from '@openmsupply-client/common';
import { useSuppliers } from '../../api';
import { basicFilterOptions, NameSearchInputProps } from '../../utils';
import { NameRowFragment } from '../../api';

const optionRenderer: AutocompleteOptionRenderer<NameRowFragment> = (
  props,
  item
) => (
  <DefaultAutocompleteItemOption {...props}>
    <Typography
      sx={{
        marginInlineEnd: '10px',
        fontWeight: 'bold',
        width: 75,
        color: item.store ? 'red' : 'inherit',
      }}
    >
      {item.code}
    </Typography>
    <Typography>{item.name}</Typography>
  </DefaultAutocompleteItemOption>
);

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
