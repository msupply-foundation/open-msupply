import { NumUtils } from '@common/utils';
import React, { ForwardedRef } from 'react';
import { NumericTextInputProps, NumericTextInput } from './NumericTextInput';

interface NonNegativeIntegerInputProps
  extends Omit<NumericTextInputProps, 'onChange'> {
  max?: number;
  onChange: (newValue: number) => void;
}

// where NonNegative is n >=0
export const NonNegativeIntegerInput = React.forwardRef(
  (
    {
      sx,
      disabled = false,
      value,
      max = 4294967295,
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
        onChange={value =>
          onChange(NumUtils.constrain(Math.round(value), 0, max))
        }
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
