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
  const [date, setDate] = React.useState<Date | null>(value);

  return (
    <BaseDatePickerInput
      disabled={disabled}
      views={['year', 'month']}
      format="dd/MM/yyyy"
      value={value}
      onChange={d => {
        setDate(d);
        if (
          d &&
          date &&
          (d.getMonth() !== date.getMonth() ||
            d.getFullYear() !== date.getFullYear())
        ) {
          onChange(lastDayOfMonth(d));
        } else {
          onChange(d);
        }
      }}
    />
  );
};
