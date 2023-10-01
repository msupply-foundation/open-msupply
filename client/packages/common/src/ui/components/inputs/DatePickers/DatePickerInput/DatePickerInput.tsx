import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  onError?: (validationError: string) => void;
  width?: number;
  error?: string | undefined;
}

export const DatePickerInput: FC<DatePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  onError,
  width,
  error,
}) => {
  return (
    <BaseDatePickerInput
      disabled={disabled}
      format="dd/MM/yyyy"
      onChange={onChange}
      value={value || null}
      onError={onError}
      width={width}
      error={error}
    />
  );
};
