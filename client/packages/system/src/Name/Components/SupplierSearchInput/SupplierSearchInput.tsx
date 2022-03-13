import React, { FC } from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Autocomplete,
  useBufferState,
  HomeIcon,
  Box,
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
        width: 110,
      }}
    >
      <Box display="flex" alignItems="flex-end" gap={1}>
        <Box flex={0} style={{ height: 24, width: 20 }}>
          {!!item.store && <HomeIcon fontSize="small" />}
        </Box>
        <Box flex={1}>{item.code}</Box>
      </Box>
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
