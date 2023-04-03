import React, { FC, useEffect, useState } from 'react';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { useAppTheme } from '@common/styles';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';

export const DateTimePickerInput: FC<
  Omit<DateTimePickerProps<Date, Date>, 'renderInput' | 'value'> & {
    onChange(date: Date): void;
    value: Date | string | null;
  }
> = ({ disabled, onChange, value, ...props }) => {
  const theme = useAppTheme();
  const [internalValue, setInternalValue] = useState<Date | null>(null);

  useEffect(() => {
    // This sets the internal state from parent when first loading (i.e. when
    // the internal date is still empty)
    if (value && internalValue === null)
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
    <DateTimePicker
      disabled={disabled}
      inputFormat="dd/MM/yyyy HH:mm"
      PopperProps={{
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
      }}
      PaperProps={{
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
      }}
      renderInput={(params: TextFieldProps) => {
        const textInputProps: StandardTextFieldProps = {
          ...params,
          variant: 'standard',
          sx: { width: '150px', ...params.sx },
        };
        return (
          <BasicTextInput
            disabled={!!disabled}
            {...textInputProps}
            error={isInvalid(internalValue)}
            sx={{ width: 250 }}
          />
        );
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
