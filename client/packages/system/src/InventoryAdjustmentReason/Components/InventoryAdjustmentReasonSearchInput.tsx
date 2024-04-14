import React, { FC } from 'react';
import {
  AdjustmentTypeInput,
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
  adjustmentType: AdjustmentTypeInput;
  isError?: boolean;
}

export const InventoryAdjustmentReasonSearchInput: FC<
  InventoryAdjustmentReasonSearchInputProps
> = ({
  value,
  width,
  onChange,
  autoFocus = false,
  adjustmentType,
  isError,
}) => {
  const { data, isLoading } =
    useInventoryAdjustmentReason.document.listAllActive();
  const reasonFilter = (reason: InventoryAdjustmentReasonRowFragment) => {
    if (adjustmentType === AdjustmentTypeInput.Addition)
      return reason.type === InventoryAdjustmentReasonNodeType.Positive;
    return reason.type === InventoryAdjustmentReasonNodeType.Negative;
  };
  const reasons = (data?.nodes ?? []).filter(reasonFilter);

  const isRequired = reasons.length !== 0;

  return (
    <Box display="flex" flexDirection="row" width={120}>
      <Autocomplete
        autoFocus={autoFocus}
        disabled={!isRequired}
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
            sx={{ minWidth: width }}
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
