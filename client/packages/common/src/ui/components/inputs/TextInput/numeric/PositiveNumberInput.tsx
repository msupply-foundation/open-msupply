import React, { ForwardedRef } from 'react';
import { NumericTextInput } from '@common/components';
import { NumUtils } from '@common/utils';
import { NumericTextInputProps } from './NumericTextInput';

interface PositiveNumberProps extends Omit<NumericTextInputProps, 'onChange'> {
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
}

// where Positive is n >=1
export const PositiveNumberInput = React.forwardRef(
  (
    {
      sx,
      disabled = false,
      value,
      min = 1,
      max = Number.MAX_SAFE_INTEGER,
      onChange,
      ...rest
    }: PositiveNumberProps,
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
          onChange(NumUtils.constrain(value, Math.max(0, min), max))
        }
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
