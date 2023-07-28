import React, { FC, useEffect, useState } from 'react';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';
import { BasicTextInput } from '../../TextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <BasicTextInput {...textInputProps} />;
};

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'renderInput' | 'value'> & {
    onChange(date: Date): void;
    value: Date | string | null;
    error?: string | undefined;
    width?: number;
  }
> = ({ disabled, onChange, value, error, width, ...props }) => {
  const theme = useAppTheme();
  const [internalValue, setInternalValue] = useState<Date | null>(null);

  useEffect(() => {
    // This sets the internal state from parent when value has changed and internal date needs updating
    if (value && internalValue?.toString() !== value.toString())
      setInternalValue(DateUtils.getDateOrNull(value));
  }, [value]);

  const isInvalid = (value: Date | null) => {
    const dateValue = DateUtils.getDateOrNull(value);
    return !!value && !DateUtils.isValid(dateValue);
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      // Only run the parent onChange method when the internal date is valid
      if (DateUtils.isValid(value)) onChange(value);
    },
    [onChange]
  );

  return (
    <DatePicker
      disabled={disabled}
      slots={{
        textField: TextField,
      }}
      slotProps={{
        popper: {
          sx: {
            '& .MuiTypography-root.Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .MuiTypography-root.Mui-selected:hover': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .Mui-selected:focus': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .MuiPickersDay-root.Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
          },
        },
        desktopPaper: {
          sx: {
            '& .Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}!important`,
            },
            '& .Mui-selected:focus': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .Mui-selected:hover': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
          },
        },
        textField: {
          helperText: error ?? '',
          sx: { width },
          disabled: !!disabled,
          error: isInvalid(internalValue) || !!error,
        },
      }}
      {...props}
      onChange={(d: Date | null) => {
        setInternalValue(d);
        debouncedOnChange(d);
      }}
      value={internalValue}
    />
  );
};
