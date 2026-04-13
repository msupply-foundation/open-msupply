import React, { Suspense, useEffect, useState } from 'react';
import type { TimePickerProps } from '@mui/x-date-pickers';
import { CircularProgress } from '@mui/material';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';
import { getActionBarSx, getPaperSx, getTextFieldSx } from '../styles';

const TimePicker = React.lazy(() =>
  import('@mui/x-date-pickers').then(m => ({ default: m.TimePicker }))
);

export const TimePickerInput = ({
  disabled,
  onChange,
  value,
  ...props
}: Omit<TimePickerProps, 'renderInput' | 'value'> & {
  onChange(date: Date): void;
  value: Date | string | null;
}) => {
  const [internalValue, setInternalValue] = useState<Date | null>(null);

  useEffect(() => {
    // This sets the internal state from parent when first loading (i.e. when
    // the internal date is still empty)
    if (value && internalValue === null)
      setInternalValue(DateUtils.getDateOrNull(value));
  }, [value, internalValue]);

  const isInvalid = (value: Date | null) => {
    const dateValue = DateUtils.getDateOrNull(value);
    return !!value && !DateUtils.isValid(dateValue);
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      // Only run the parent onChange method when the internal date is valid
      if (DateUtils.isValid(value)) onChange(value);
    },
    [onChange]
  );

  return (
    <Suspense fallback={<CircularProgress size={20} />}>
      <TimePicker
        disabled={disabled}
        format="HH:mm"
        slotProps={{
          desktopPaper: { sx: getPaperSx() },
          mobilePaper: { sx: getPaperSx() },
          actionBar: { sx: getActionBarSx() },

          textField: {
            disabled: !!disabled,
            error: isInvalid(internalValue),
            sx: getTextFieldSx(!!props.label, false),
          },
        }}
        {...props}
        onChange={(d: Date | null) => {
          setInternalValue(d);
          debouncedOnChange(d);
        }}
        value={internalValue}
      />
    </Suspense>
  );
};
