import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';

interface DatePickerInputProps {
  value?: Date | string | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  onError?: () => void;
}

export const DatePickerInput: FC<DatePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  onError,
}) => {
  return (
    <BaseDatePickerInput
      disabled={disabled}
      inputFormat="dd/MM/yyyy"
      onChange={onChange}
      onError={onError}
      value={value}
    />
  );
};
