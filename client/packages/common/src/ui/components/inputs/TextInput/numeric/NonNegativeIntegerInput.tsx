import { NumUtils } from '@common/utils';
import React, { ForwardedRef } from 'react';
import { NumericTextInputProps, NumericTextInput } from './NumericTextInput';

interface NonNegativeIntegerInputProps
  extends Omit<NumericTextInputProps, 'onChange'> {
  defaultValue?: number;
  max?: number;
  onChange: (newValue: number) => void;
}

// where NonNegative is n >=0
export const NonNegativeIntegerInput = React.forwardRef(
  (
    {
      sx,
      defaultValue,
      disabled = false,
      value,
      max,
      onChange,
      ...rest
    }: NonNegativeIntegerInputProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <NumericTextInput
        ref={ref}
        type="number"
        InputProps={{
          sx: { ...sx, '& .MuiInput-input': { textAlign: 'right' } },
        }}
        onChange={value => {
          if (value === undefined) {
            if (defaultValue !== undefined) onChange(defaultValue);
            return;
          }
          onChange(NumUtils.constrain(Math.round(value), 0, max ?? 4294967295));
        }}
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
