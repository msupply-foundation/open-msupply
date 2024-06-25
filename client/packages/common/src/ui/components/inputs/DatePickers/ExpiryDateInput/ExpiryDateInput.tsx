import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';
import lastDayOfMonth from 'date-fns/lastDayOfMonth';

interface ExpiryDateInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
}

export const ExpiryDateInput: FC<ExpiryDateInputProps> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <BaseDatePickerInput
      disabled={disabled}
      views={['year', 'month']}
      format="dd/MM/yyyy"
      value={value}
      onChange={d => {
        if (d) onChange(lastDayOfMonth(d));
        else onChange(d);
      }}
    />
  );
};
