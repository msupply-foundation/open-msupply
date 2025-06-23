import React from 'react';
import {
  Autocomplete,
  AutocompleteProps,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  ReasonOptionNode,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';

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
  const reasonFilter = (reasonOption: ReasonOptionNode) => {
    if (Array.isArray(type)) {
      return type.includes(reasonOption.type);
    }
    return reasonOption.type === type;
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
