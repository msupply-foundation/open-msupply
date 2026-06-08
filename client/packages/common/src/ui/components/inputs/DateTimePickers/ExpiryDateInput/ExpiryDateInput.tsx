import React, { useRef } from 'react';
import { lastDayOfMonth } from 'date-fns/lastDayOfMonth';
import { DateTimePickerInput } from '../DateTimePickerInput';

interface ExpiryDateInputProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  width?: number | string;
  label?: string;
}

export const ExpiryDateInput = ({
  value,
  onChange,
  disabled,
  width,
  label,
}: ExpiryDateInputProps) => {
  const pickerOpen = useRef(false);

  return (
    <DateTimePickerInput
      disabled={disabled}
      views={['year', 'month']}
      value={value}
      label={label}
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
      width={width}
    />
  );
};
