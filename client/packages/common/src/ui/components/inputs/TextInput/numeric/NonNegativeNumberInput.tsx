import React, { ForwardedRef } from 'react';
import { NumUtils } from '@common/utils';
import { NumericTextInputProps, NumericTextInput } from './NumericTextInput';

interface NonNegativeNumberProps
  extends Omit<NumericTextInputProps, 'onChange'> {
  max?: number;
  onChange: (newValue: number) => void;
}

// where NonNegative is n >=0
export const NonNegativeNumberInput = React.forwardRef(
  (
    {
      sx,
      disabled = false,
      value,
      max = 999999999,
      onChange,
      ...rest
    }: NonNegativeNumberProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <NumericTextInput
        ref={ref}
        type="number"
        InputProps={{
          sx: { ...sx, '& .MuiInput-input': { textAlign: 'right' } },
        }}
        onChange={e => {
          const newValue = NumUtils.parseString(e.target.value, 0, max);
          onChange(newValue);
        }}
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
