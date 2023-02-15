import React, { FC } from 'react';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { useAppTheme } from '@common/styles';

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'renderInput'>
> = props => {
  const theme = useAppTheme();

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
          <BasicTextInput disabled={!!props.disabled} {...textInputProps} />
        );
      }}
      {...props}
    />
  );
};
