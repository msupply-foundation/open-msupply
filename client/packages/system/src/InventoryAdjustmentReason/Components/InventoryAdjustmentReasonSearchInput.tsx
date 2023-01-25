import React, { FC } from 'react';
import {
  Autocomplete,
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
}

export const InventoryAdjustmentReasonSearchInput: FC<
  InventoryAdjustmentReasonSearchInputProps
> = ({ value, width, onChange, autoFocus = false, stockReduction }) => {
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
