import React, { FC } from 'react';
import {
  TimePicker,
  TimePickerProps,
} from '@mui/x-date-pickers/TimePicker/TimePicker';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';

export const TimePickerInput: FC<
  Omit<TimePickerProps<Date>, 'renderInput'>
> = props => {
  return (
    <TimePicker
      disabled={props.disabled}
      renderInput={(params: TextFieldProps) => {
        const textInputProps: StandardTextFieldProps = {
          ...params,
          variant: 'standard',
          sx: { width: '150px', ...params.sx },
        };
        return (
          <BasicTextInput disabled={!!props.disabled} {...textInputProps} />
        );
      }}
      {...props}
    />
  );
};
