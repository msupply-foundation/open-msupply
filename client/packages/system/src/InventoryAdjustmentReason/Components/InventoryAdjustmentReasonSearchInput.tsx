import React from 'react';
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
  InventoryAdjustmentReasonRowFragment,
  useInventoryAdjustmentReasonList,
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
  isDisabled?: boolean;
  initialStocktake?: boolean;
}

export const InventoryAdjustmentReasonSearchInput = ({
  value,
  width,
  onChange,
  autoFocus = false,
  adjustmentType,
  isError,
  isDisabled,
  initialStocktake,
}: InventoryAdjustmentReasonSearchInputProps) => {
  const { data, isLoading } = useInventoryAdjustmentReasonList();
  const reasonFilter = (reason: InventoryAdjustmentReasonRowFragment) => {
    if (adjustmentType === AdjustmentTypeInput.Addition)
      return reason.type === InventoryAdjustmentReasonNodeType.Positive;
    return reason.type === InventoryAdjustmentReasonNodeType.Negative;
  };
  const reasons = (data?.nodes ?? []).filter(reasonFilter);

  const reasonsAvailable = reasons.length !== 0;
  const isRequired = reasonsAvailable && !initialStocktake;

  return (
    <Box display="flex" flexDirection="row" width={120}>
      <Autocomplete
        autoFocus={autoFocus}
        disabled={isDisabled || !isRequired}
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
            slotProps={{
              input: {
                disableUnderline: false,
                style: props.disabled ? { paddingLeft: 0 } : {},
                ...props.InputProps,
              },
              htmlInput: {
                ...props.inputProps,
              },
            }}
            sx={{ minWidth: width }}
            error={isError}
            required={isRequired && !isDisabled}
          />
        )}
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
