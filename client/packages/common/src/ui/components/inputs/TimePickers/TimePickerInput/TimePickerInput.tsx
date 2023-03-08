import React, { FC, useEffect, useState } from 'react';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils } from '@common/intl';
import { useDebounceCallback } from '@common/hooks';

export const TimePickerInput: FC<
  Omit<TimePickerProps<Date>, 'renderInput'>
> = props => {
  const [internalValue, setInternalValue] = useState<
    Date | string | number | null
  >();

  useEffect(() => {
    setInternalValue(props.value);
  }, [props.value]);

  const isInvalid = (value: Date | string | number | null | undefined) => {
    return !!value && !DateUtils.isValid(value);
  };

  const debouncedOnChange = useDebounceCallback(
    date => {
      // If the date is not valid just update the internal state. But if it is
      // valid, we call the parent "onChange", which will cause the internal
      // state to update via the `useEffect`.
      if (DateUtils.isValid(date)) props.onChange(date);
      else setInternalValue(date);
    },
    [props.onChange]
  );

  return (
    <TimePicker
      disabled={props.disabled}
      renderInput={(params: TextFieldProps) => {
        const textInputProps: StandardTextFieldProps = {
          ...params,
          variant: 'standard',
          sx: { width: '150px', ...params.sx },
        };
        return (
          <BasicTextInput
            disabled={!!props.disabled}
            {...textInputProps}
            error={isInvalid(internalValue)}
          />
        );
      }}
      {...props}
      onChange={debouncedOnChange}
      value={internalValue}
    />
  );
};
