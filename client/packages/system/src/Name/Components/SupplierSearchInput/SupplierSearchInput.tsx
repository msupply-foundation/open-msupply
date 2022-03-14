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
    <Box display="flex" alignItems="flex-end" gap={1} height={25}>
      <Box display="flex" flexDirection="row" gap={1} width={110}>
        <Box flex={0} style={{ height: 24, minWidth: 20 }}>
          {!!item.store && <HomeIcon fontSize="small" />}
        </Box>
        <Typography
          overflow="hidden"
          fontWeight="bold"
          textOverflow="ellipsis"
          sx={{
            whiteSpace: 'no-wrap',
          }}
        >
          {item.code}
        </Typography>
      </Box>
      <Typography>{item.name}</Typography>
    </Box>
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
