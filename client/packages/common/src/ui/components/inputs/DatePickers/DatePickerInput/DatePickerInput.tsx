import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
}

export const DatePickerInput: FC<DatePickerInputProps> = ({
  value,
  onChange,
}) => {
  return (
    <BaseDatePickerInput
      inputFormat="dd/MM/yyyy"
      onChange={onChange}
      value={value}
    />
  );
};
