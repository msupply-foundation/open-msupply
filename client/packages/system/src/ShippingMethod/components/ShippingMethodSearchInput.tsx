import React from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  DefaultAutocompleteItemOption,
  Box,
  Typography,
  SxProps,
} from '@openmsupply-client/common';
import { ShippingMethodRowFragment, useShippingMethod } from '../api';

interface ShippingMethodSearchInputProps {
  value?: ShippingMethodRowFragment | null;
  width?: number;
  popperMinWidth?: number;
  onChange: (shippingMethod: ShippingMethodRowFragment | null) => void;
  disabled?: boolean;
  sx?: SxProps;
}

const getShippingMethodRenderer =
  (): AutocompleteOptionRenderer<ShippingMethodRowFragment> =>
  (props, shippingMethod) => {
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Typography>{shippingMethod.method}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

export const ShippingMethodSearchInput = ({
  value,
  width,
  popperMinWidth,
  onChange,
  disabled = false,
  sx,
}: ShippingMethodSearchInputProps) => {
  const { data, isLoading } = useShippingMethod();

  const shippingMethodOptionRenderer = getShippingMethodRenderer();

  if (!data) return null;

  return (
    <Autocomplete
      clearable={false}
      value={value}
      loading={isLoading}
      onChange={(_, shippingMethod) => onChange(shippingMethod)}
      options={data?.nodes ?? []}
      getOptionLabel={option => option.method}
      renderOption={shippingMethodOptionRenderer}
      width={width ? `${width}px` : undefined}
      popperMinWidth={popperMinWidth}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      disabled={disabled}
      sx={{
        '.MuiInputBase-root': { backgroundColor: 'white' },
        ...sx,
      }}
    />
  );
};
