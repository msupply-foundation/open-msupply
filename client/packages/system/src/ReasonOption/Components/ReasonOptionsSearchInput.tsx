import React from 'react';
import {
  Autocomplete,
  AutocompleteProps,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  ReasonOptionNode,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { useReasonOptions } from '../api';

interface ReasonOptionsSearchInputProps
  extends Omit<
    AutocompleteProps<ReasonOptionNode>,
    'value' | 'onChange' | 'options' | 'width' | 'loading'
  > {
  value?: ReasonOptionNode | null;
  onChange: (reasonOption: ReasonOptionNode | null) => void;
  type: ReasonOptionNodeType | ReasonOptionNodeType[];
  fallbackType?: ReasonOptionNodeType;
  initialStocktake?: boolean;
  width?: number;
}

export const ReasonOptionsSearchInput = ({
  value,
  width,
  onChange,
  type,
  fallbackType,
  initialStocktake,
  disabled,
  ...restProps
}: ReasonOptionsSearchInputProps) => {
  const { data: reasonOptions, isLoading } = useReasonOptions();

  const reasonFilter = (reasonOption: ReasonOptionNode) => {
    if (Array.isArray(type)) {
      return type.includes(reasonOption.type);
    }
    return reasonOption.type === type;
  };
  let reasons = (reasonOptions?.nodes ?? []).filter(reasonFilter);

  if (reasons.length === 0 && fallbackType) {
    reasons = (reasonOptions?.nodes ?? []).filter(
      reasonOption => reasonOption.type === fallbackType
    );
  }

  const isRequired = reasons.length !== 0 && !initialStocktake;

  return (
    <Autocomplete
      sx={{ width: width ? `${width}px` : '100%' }}
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
      loading={isLoading}
      options={defaultOptionMapper(reasons, 'reason')}
      renderOption={getDefaultOptionRenderer('reason')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      {...restProps}
    />
  );
};
