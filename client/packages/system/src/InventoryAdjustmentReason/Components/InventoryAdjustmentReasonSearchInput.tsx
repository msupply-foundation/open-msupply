import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Box,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  InventoryAdjustmentReasonNodeType,
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
  const isRequired = !disabled && stockReduction !== 0;
  const reasonFilter = (reason: InventoryAdjustmentReasonRowFragment) => {
    if (stockReduction === 0 || !stockReduction) return true;
    if (stockReduction < 0)
      return reason.type === InventoryAdjustmentReasonNodeType.Positive;
    return reason.type === InventoryAdjustmentReasonNodeType.Negative;
  };
  const reasons = (data?.nodes ?? []).filter(reasonFilter);

  return (
    <Box display="flex" flexDirection="row" width={120}>
      <Autocomplete
        autoFocus={autoFocus}
        disabled={disabled}
        width={`${width}px`}
        clearable={false}
        value={
          value
            ? {
                ...value,
                label: value.reason,
              }
            : null
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
            error={isError && isRequired}
            required={isRequired}
            boxSx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          />
        )}
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
