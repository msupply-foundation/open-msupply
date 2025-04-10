import React, { FC } from 'react';
import {
  Autocomplete,
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
  isDisabled?: boolean;
}

export const ReturnReasonSearchInput: FC<ReturnReasonSearchInputProps> = ({
  selectedReasonId,
  onChange,
  autoFocus = false,
  isDisabled,
}) => {
  const { data, isLoading } = useReturnReason.document.listAllActive();
  const reasons = data?.nodes ?? [];

  const value = reasons.find(reason => reason.id === selectedReasonId);

  return (
    <Box display="flex" flexDirection="row">
      <Autocomplete
        fullWidth
        autoFocus={autoFocus}
        disabled={isDisabled || reasons.length === 0}
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
        options={defaultOptionMapper(reasons, 'reason')}
        renderOption={getDefaultOptionRenderer('reason')}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
      />
    </Box>
  );
};
