import React, { FC, useEffect, useState } from 'react';
import {
  DatePicker,
  DatePickerProps,
} from '@mui/x-date-pickers/DatePicker/DatePicker';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { useAppTheme } from '@common/styles';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date, Date>, 'renderInput' | 'value'> & {
    value: Date | string | null;
  }
> = props => {
  const theme = useAppTheme();
  const [internalValue, setInternalValue] = useState<Date | null>(null);

  useEffect(() => {
    // This sets the internal state from parent when first loading (i.e. when
    // the internal date is still empty)
    if (props.value && internalValue === null)
      setInternalValue(DateUtils.getDateOrNull(props.value));
  }, [props.value]);

  const isInvalid = (value: Date | string | number | null | undefined) => {
    const dateValue =
      typeof value === 'string' ? DateUtils.getDateOrNull(value) : value;
    return !!value && !DateUtils.isValid(dateValue);
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      // Only run the parent onChange method when the internal date is valid
      if (DateUtils.isValid(value)) props.onChange(value);
    },
    [props.onChange]
  );

  return (
    <DatePicker
      disabled={props.disabled}
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
        };
        return (
          <BasicTextInput
            disabled={!!props.disabled}
            {...textInputProps}
            error={isInvalid(internalValue)}
          />
        );
      }}
      {...props}
      onChange={d => {
        setInternalValue(d);
        debouncedOnChange(d);
      }}
      value={internalValue}
    />
  );
};
