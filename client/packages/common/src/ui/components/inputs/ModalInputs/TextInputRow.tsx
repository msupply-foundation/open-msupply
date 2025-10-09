import React from 'react';
import {
  BasicTextInput,
  Box,
  commonInputContainerSx,
  commonLabelProps,
  createLabelRowSx,
  inputSlotProps,
  InputWithLabelRow,
} from '@openmsupply-client/common';

interface TextInputProps {
  label: string;
  value: string;
  isVerticalScreen: boolean;
  onChange?: (value?: string) => void;
  disabled: boolean;
}

export const TextInput = ({
  label,
  value,
  isVerticalScreen,
  onChange,
  disabled,
}: TextInputProps) => {
  return (
    <Box sx={commonInputContainerSx}>
      <InputWithLabelRow
        Input={
          <BasicTextInput
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            slotProps={inputSlotProps(disabled)}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={disabled}
          />
        }
        label={label}
        labelProps={commonLabelProps()}
        sx={createLabelRowSx(isVerticalScreen)}
      />
    </Box>
  );
};
