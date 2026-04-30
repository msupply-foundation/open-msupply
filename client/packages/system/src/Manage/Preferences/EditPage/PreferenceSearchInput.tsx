import React from 'react';
import {
  BasicTextInput,
  Box,
  EndAdornment,
  FilterIcon,
} from '@openmsupply-client/common';

interface PreferenceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const PreferenceSearchInput = ({
  value,
  onChange,
}: PreferenceSearchInputProps) => (
  <Box mb={2}>
    <BasicTextInput
      disabled={false}
      value={value}
      onChange={searchTerm => onChange(searchTerm?.target?.value ?? '')}
      fullWidth
      slotProps={{
        input: {
          endAdornment: (
            <EndAdornment
              isLoading={false}
              hasValue={!!value}
              onClear={() => onChange('')}
              noValueIcon={<FilterIcon fontSize="small" />}
            />
          ),
        },
      }}
    />
  </Box>
);
