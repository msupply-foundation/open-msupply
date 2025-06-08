import React, { FC, useEffect, useState } from 'react';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
    sx: { width: '150px', ...params.sx },
  };
  return <BasicTextInput {...textInputProps} />;
};

export const TimePickerInput: FC<
  Omit<TimePickerProps, 'renderInput' | 'value'> & {
    onChange(date: Date): void;
    value: Date | string | null;
  }
> = ({ disabled, onChange, value, ...props }) => {
  const [internalValue, setInternalValue] = useState<Date | null>(null);

  useEffect(() => {
    // This sets the internal state from parent when first loading (i.e. when
    // the internal date is still empty)
    if (value && internalValue === null)
      setInternalValue(DateUtils.getDateOrNull(value));
  }, [value]);

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
    <TimePicker
      disabled={disabled}
      format="HH:mm"
      slots={{
        textField: TextField,
      }}
      slotProps={{
        textField: {
          disabled: !!disabled,
          error: isInvalid(internalValue),
        },
      }}
      {...props}
      onChange={(d: Date | null) => {
        setInternalValue(d);
        debouncedOnChange(d);
      }}
      value={internalValue}
    />
  );
};
