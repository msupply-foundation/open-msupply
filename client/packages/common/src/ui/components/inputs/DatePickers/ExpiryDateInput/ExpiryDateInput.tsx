import React, { FC } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';
import lastDayOfMonth from 'date-fns/lastDayOfMonth';

interface ExpiryDateInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
}

export const ExpiryDateInput: FC<ExpiryDateInputProps> = ({
  value,
  onChange,
}) => {
  return (
    <BaseDatePickerInput
      views={['year', 'month']}
      inputFormat="MM/yyyy"
      value={value}
      onChange={d => {
        if (d) onChange(lastDayOfMonth(d));
        else onChange(d);
      }}
    />
  );
};
