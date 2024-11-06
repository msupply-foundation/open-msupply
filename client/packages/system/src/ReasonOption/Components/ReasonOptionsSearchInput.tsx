import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Box,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  ReasonOptionNode,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { reasonOptions } from '../api';

interface ReasonOptionsSearchInputProps {
  value?: ReasonOptionNode | null;
  width?: number | string;
  onChange: (reasonOption: ReasonOptionNode | null) => void;
  autoFocus?: boolean;
  type: ReasonOptionNodeType;
  isError?: boolean;
  isDisabled?: boolean;
}

export const ReasonOptionsSearchInput: FC<ReasonOptionsSearchInputProps> = ({
  value,
  width,
  onChange,
  autoFocus = false,
  type,
  isError,
  isDisabled,
}) => {
  const { data, isLoading } = reasonOptions.document.listAllActive();

  const reasonFilter = (reason: ReasonOptionNode) => {
    switch (type) {
      case ReasonOptionNodeType.PositiveInventoryAdjustment:
        return reason.type === ReasonOptionNodeType.PositiveInventoryAdjustment;
      case ReasonOptionNodeType.NegativeInventoryAdjustment:
        return reason.type === ReasonOptionNodeType.NegativeInventoryAdjustment;
      case ReasonOptionNodeType.RequisitionLineVariance:
        return reason.type === ReasonOptionNodeType.RequisitionLineVariance;
      case ReasonOptionNodeType.ReturnReason:
        return reason.type === ReasonOptionNodeType.ReturnReason;
      default:
        return false;
    }
  };
  const reasons = (data?.nodes ?? []).filter(reasonFilter);

  const isRequired = reasons.length !== 0;

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
            InputProps={{
              disableUnderline: false,
              style: props.disabled ? { paddingLeft: 0 } : {},
              ...props.InputProps,
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
