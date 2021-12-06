import React, { FC } from 'react';
import DatePicker, { DatePickerProps } from '@mui/lab/DatePicker';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'renderInput'>
> = props => {
  return (
    <DatePicker
      renderInput={(params: TextFieldProps) => {
        const props: StandardTextFieldProps = {
          ...params,
          variant: 'standard',
        };
        return <BasicTextInput {...props} />;
      }}
      {...props}
    />
  );
};
