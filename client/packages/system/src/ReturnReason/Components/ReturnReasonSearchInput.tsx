import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Box,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@openmsupply-client/common';
import { useReturnReason } from '../api';

interface ReturnReasonSearchInputProps {
  selectedReasonId: string | null;
  onChange: (reasonId: string) => void;
  autoFocus?: boolean;
  isError?: boolean;
}

export const ReturnReasonSearchInput: FC<ReturnReasonSearchInputProps> = ({
  selectedReasonId,
  onChange,
  autoFocus = false,
  isError,
}) => {
  const { data, isLoading } = useReturnReason.document.listAllActive();
  const reasons = data?.nodes ?? [];

  const value = reasons.find(reason => reason.id === selectedReasonId);

  return (
    <Box display="flex" flexDirection="row">
      <Autocomplete
        fullWidth
        autoFocus={autoFocus}
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
          onChange(reason?.id ?? '');
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
            error={isError}
            required={true}
          />
        )}
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
