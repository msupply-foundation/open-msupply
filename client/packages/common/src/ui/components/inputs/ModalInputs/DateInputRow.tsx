import React from 'react';
import {
  Box,
  commonLabelProps,
  createLabelRowSx,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  InputWithLabelRow,
  useTheme,
  commonInputContainerSx,
  useMediaQuery,
} from '@openmsupply-client/common';

interface DateInputProps {
  label: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled: boolean;
}

export const DateInput = ({
  label,
  value,
  onChange,
  disabled,
}: DateInputProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  const theme = useTheme();
  const date = DateUtils.getDateOrNull(value);
  const handleChange = (newValue: Date | null) => {
    if (newValue) {
      onChange?.(Formatter.naiveDate(newValue));
    } else {
      onChange?.(null);
    }
  };

  return (
    <Box sx={{ ...commonInputContainerSx, px: 0 }}>
      <InputWithLabelRow
        Input={
          <DateTimePickerInput
            showTime={false}
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            textFieldSx={{
              boxShadow: !disabled ? theme.shadows[2] : 'none',
              background: disabled
                ? theme.palette.background.toolbar
                : theme.palette.background.white,
            }}
            value={date}
            onChange={handleChange}
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
