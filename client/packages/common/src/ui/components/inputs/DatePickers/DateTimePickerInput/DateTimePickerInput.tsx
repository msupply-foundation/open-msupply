import React, { FC, useEffect, useState } from 'react';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { useAppTheme } from '@common/styles';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';

export const DateTimePickerInput: FC<
  Omit<DateTimePickerProps<Date>, 'renderInput'>
> = props => {
  const theme = useAppTheme();

  const [internalValue, setInternalValue] = useState<
    Date | string | number | null
  >();

  useEffect(() => {
    if (props.value) setInternalValue(props.value);
  }, [props.value]);

  const isInvalid = (value: Date | string | number | null | undefined) => {
    const dateValue =
      typeof value === 'string' ? DateUtils.getDateOrNull(value) : value;
    return !!value && !DateUtils.isValid(dateValue);
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (DateUtils.isValid(value)) props.onChange(value);
      else setInternalValue(value);
    },
    [props.onChange]
  );

  return (
    <DateTimePicker
      disabled={props.disabled}
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
            disabled={!!props.disabled}
            {...textInputProps}
            error={isInvalid(internalValue)}
            sx={{ width: 250 }}
          />
        );
      }}
      {...props}
      onChange={debouncedOnChange}
      value={internalValue || null}
    />
  );
};
