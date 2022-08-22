import React, { FC } from 'react';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers';
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
          sx: { width: '120px', ...params.sx },
        };
        return (
          <BasicTextInput disabled={!!props.disabled} {...textInputProps} />
        );
      }}
      {...props}
    />
  );
};
