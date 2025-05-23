import React from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Box,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  ReasonOptionNode,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';

interface ReasonOptionsSearchInputProps {
  value?: ReasonOptionNode | null;
  width?: number | string;
  onChange: (reasonOption: ReasonOptionNode | null) => void;
  autoFocus?: boolean;
  type: ReasonOptionNodeType | ReasonOptionNodeType[];
  isError?: boolean;
  isDisabled?: boolean;
  onBlur?: () => void;
  initialStocktake?: boolean;
  reasonOptions: ReasonOptionNode[];
  isLoading: boolean;
}

export const ReasonOptionsSearchInput = ({
  value,
  width,
  onChange,
  autoFocus = false,
  type,
  isError,
  isDisabled,
  onBlur,
  initialStocktake,
  reasonOptions,
  isLoading,
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
                sx: {
                  background: isDisabled
                    ? theme => theme.palette.background.drawer
                    : theme => theme.palette.background.white,
                  paddingLeft: props.disabled ? 0 : {},
                },
                ...props.InputProps,
              },
            }}
            sx={{ minWidth: width }}
            error={isError}
            required={isRequired && !isDisabled}
            onBlur={onBlur}
          />
        )}
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
