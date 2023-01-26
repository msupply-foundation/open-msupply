import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Box,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  Typography,
} from '@openmsupply-client/common';
import {
  useInventoryAdjustmentReason,
  InventoryAdjustmentReasonRowFragment,
} from '../api';

interface InventoryAdjustmentReasonSearchInputProps {
  value: InventoryAdjustmentReasonRowFragment | null;
  width?: number | string;
  onChange: (
    inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null
  ) => void;
  autoFocus?: boolean;
  stockReduction?: number;
  isError?: boolean;
}

export const InventoryAdjustmentReasonSearchInput: FC<
  InventoryAdjustmentReasonSearchInputProps
> = ({
  value,
  width,
  onChange,
  autoFocus = false,
  stockReduction,
  isError,
}) => {
  const { data, isLoading } =
    useInventoryAdjustmentReason.document.listAllActive();
  const disabled = data?.totalCount === 0;

  return (
    <Box display="flex" flexDirection="row" width={120}>
      <Autocomplete<InventoryAdjustmentReasonRowFragment>
        autoFocus={autoFocus}
        disabled={disabled}
        width={`${width}px`}
        clearable={false}
        value={
          value && {
            ...value,
            label: value.reason,
          }
        }
        loading={isLoading}
        onChange={(_, reason) => {
          onChange(reason);
        }}
        renderInput={props => (
          <BasicTextInput
            {...props}
            autoFocus={autoFocus}
            InputProps={{
              disableUnderline: false,
              style: props.disabled ? { paddingLeft: 0 } : {},
              ...props.InputProps,
            }}
            sx={{ width }}
            error={isError}
          />
        )}
        options={defaultOptionMapper(data?.nodes ?? [], 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
      {!disabled && stockReduction !== 0 && (
        <Typography
          sx={{
            color: 'primary.light',
            paddingLeft: 0.5,
            fontSize: '17px',
          }}
        >
          *
        </Typography>
      )}
    </Box>
  );
};
