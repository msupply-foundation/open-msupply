import React from 'react';
import {
  Box,
  BufferedTextArea,
  Typography,
  inputSlotProps,
} from '@openmsupply-client/common';

interface MultilineTextInputProps {
  label: string;
  value: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  /** Stamped on the underlying textarea for e2e locators. */
  testId?: string;
}

export const MultilineTextInput = ({
  label,
  value,
  onChange,
  disabled = false,
  testId,
}: MultilineTextInputProps) => {
  return (
    <Box flex={1}>
      <Typography variant="body1" fontWeight="bold" pt={0.5}>
        {label}:
      </Typography>
      <BufferedTextArea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        slotProps={inputSlotProps(disabled)}
        disabled={disabled}
        minRows={3}
        maxRows={3}
        inputProps={testId ? { 'data-testid': testId } : undefined}
      />
    </Box>
  );
};
