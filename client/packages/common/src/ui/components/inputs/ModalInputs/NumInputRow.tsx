import React from 'react';

import {
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  NumUtils,
  SxProps,
  Theme,
  useMediaQuery,
} from '@openmsupply-client/common';
import { inputSlotProps, commonLabelProps, createLabelRowSx } from './utils';

export interface NumInputRowProps extends NumericTextInputProps {
  label: string;
  onChange?: (value?: number) => void;
  disabled?: boolean;
  endAdornment?: string;
  sx?: SxProps<Theme>;
  showExtraFields?: boolean;
  disabledOverride?: boolean;
  value: number | undefined;
  dosesCaption?: React.ReactNode;
}

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled = false,
  max,
  decimalLimit,
  endAdornment,
  sx,
  showExtraFields = false,
  disabledOverride,
  dosesCaption,
  ...rest
}: NumInputRowProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  const roundedValue = value ? NumUtils.round(value) : 0;

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;
    onChange(newValue);
  };

  return (
    <Box sx={{ marginBottom: 1, px: 1, flex: 1, ...sx }}>
      <InputWithLabelRow
        Input={
          <NumericTextInput
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
            min={0}
            value={roundedValue}
            onChange={handleChange}
            disabled={disabledOverride || disabled}
            max={max}
            decimalLimit={decimalLimit ?? 0}
            endAdornment={endAdornment}
            {...rest}
          />
        }
        label={label}
        labelProps={commonLabelProps(showExtraFields)}
        sx={createLabelRowSx(isVerticalScreen)}
      />
      {dosesCaption}
    </Box>
  );
};
