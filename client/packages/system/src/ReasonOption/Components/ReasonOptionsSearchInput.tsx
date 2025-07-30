import React from 'react';
import {
  Autocomplete,
  AutocompleteProps,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  ReasonOptionNode,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { useReasonOptions } from '../api/hooks/useReasonOptions';

interface ReasonOptionsSearchInputProps
  extends Omit<
    AutocompleteProps<ReasonOptionNode>,
    'value' | 'onChange' | 'options' | 'width'
  > {
  value?: ReasonOptionNode | null;
  onChange: (reasonOption: ReasonOptionNode | null) => void;
  type: ReasonOptionNodeType | ReasonOptionNodeType[];
  initialStocktake?: boolean;
  reasonOptions: ReasonOptionNode[];
  width?: number;
}

export const ReasonOptionsSearchInput = ({
  value,
  width,
  onChange,
  type,
  initialStocktake,
  reasonOptions,
  disabled,
  ...restProps
}: ReasonOptionsSearchInputProps) => {
  const { data, isLoading } = useReasonOptions();

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

  const reasons = (reasonOptions ?? []).filter(reasonFilter);
  const isRequired = reasons.length !== 0 && !initialStocktake;

  return (
    <Autocomplete
      width={`${width}px`}
      disabled={disabled || !isRequired}
      clearable={false}
      value={
        value
          ? {
              ...value,
              label: value.reason,
            }
          : null
      }
      required={isRequired && !disabled}
      inputProps={{
        ...restProps.inputProps,
      }}
      onChange={(_, reason) => {
        onChange(reason);
      }}
      options={defaultOptionMapper(reasons, 'reason')}
      renderOption={getDefaultOptionRenderer('reason')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      {...restProps}
    />
  );
};
