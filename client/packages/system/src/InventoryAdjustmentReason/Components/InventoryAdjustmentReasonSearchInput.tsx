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

export enum Adjustment {
  Reduction,
  Addition,
  None,
}

interface InventoryAdjustmentReasonSearchInputProps {
  value: InventoryAdjustmentReasonRowFragment | null;
  width?: number | string;
  onChange: (
    inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null
  ) => void;
  autoFocus?: boolean;
  adjustment: Adjustment;
  isError?: boolean;
}

export const InventoryAdjustmentReasonSearchInput: FC<
  InventoryAdjustmentReasonSearchInputProps
> = ({ value, width, onChange, autoFocus = false, adjustment, isError }) => {
  const { data, isLoading } =
    useInventoryAdjustmentReason.document.listAllActive();
  const isRequired = data?.totalCount !== 0;
  const isDisabled = adjustment === Adjustment.None || !isRequired;
  const reasonFilter = (reason: InventoryAdjustmentReasonRowFragment) => {
    if (adjustment === Adjustment.None) return false;
    if (adjustment === Adjustment.Addition)
      return reason.type === InventoryAdjustmentReasonNodeType.Positive;
    return reason.type === InventoryAdjustmentReasonNodeType.Negative;
  };
  const reasons = (data?.nodes ?? []).filter(reasonFilter);

  return (
    <Box display="flex" flexDirection="row" width={120}>
      <Autocomplete
        autoFocus={autoFocus}
        disabled={isDisabled}
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
            error={isError}
            required={isRequired}
          />
        )}
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
