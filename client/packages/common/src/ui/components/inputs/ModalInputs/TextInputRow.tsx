import React from 'react';
import {
  BasicTextInput,
  Box,
  commonInputContainerSx,
  commonLabelProps,
  createLabelRowSx,
  inputSlotProps,
  InputWithLabelRow,
  useMediaQuery,
} from '@openmsupply-client/common';

interface TextInputProps {
  label: string;
  value: string;
  onChange?: (value?: string) => void;
  disabled: boolean;
}

export const TextInput = ({
  label,
  value,
  onChange,
  disabled,
}: TextInputProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

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
                textAlign: 'right',
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
