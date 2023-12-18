import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';
import { TextFieldProps } from '@mui/material';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  onError?: (validationError: string) => void;
  width?: number | string;
  error?: string | undefined;
  label?: string;
  textFieldProps?: TextFieldProps;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePickerInput: FC<DatePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  onError,
  width,
  error,
  label,
  minDate,
  maxDate,
  textFieldProps,
}) => {
  return (
    <BaseDatePickerInput
      disabled={disabled}
      format="P"
      onChange={onChange}
      value={value || null}
      onError={onError}
      width={width}
      error={error}
      label={label}
      minDate={minDate}
      maxDate={maxDate}
      textFieldProps={textFieldProps}
    />
  );
};
