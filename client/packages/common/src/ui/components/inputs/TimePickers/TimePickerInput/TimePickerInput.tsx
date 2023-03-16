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
    if (props.value && props.value !== internalValue)
      setInternalValue(props.value);
  }, [props.value]);

  const isInvalid = (value: Date | string | number | null | undefined) => {
    const dateValue =
      typeof value === 'string' ? DateUtils.getDateOrNull(value) : value;
    return !!value && !DateUtils.isValid(dateValue);
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (DateUtils.isValid(value)) props.onChange(value);
      else props.onChange(null);
      setInternalValue(value);
    },
    [props.onChange]
  );

  return (
    <TimePicker
      disabled={props.disabled}
      inputFormat="HH:mm"
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
      value={internalValue || null}
    />
  );
};
