import React, { FC, useRef } from 'react';
import { BaseDatePickerInput } from '../BaseDatePickerInput';
import { lastDayOfMonth } from 'date-fns/lastDayOfMonth';

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
  const pickerOpen = useRef(false);

  return (
    <BaseDatePickerInput
      disabled={disabled}
      views={['year', 'month']}
      format="dd/MM/yyyy"
      value={value}
      onChange={d => {
        // Only set the date to last day of month if done through the picker,
        // not the keyboard
        if (
          pickerOpen.current &&
          d &&
          (d?.getMonth() !== value?.getMonth() ||
            d?.getFullYear() !== value?.getFullYear())
        ) {
          onChange(lastDayOfMonth(d));
        } else {
          onChange(d);
        }
      }}
      setIsOpen={open => (pickerOpen.current = open)}
    />
  );
};
