import React, { ForwardedRef } from 'react';
import { NumericTextInput } from '@common/components';
import { NumUtils } from '@common/utils';
import { NumericTextInputProps } from './NumericTextInput';

interface PositiveNumberProps extends Omit<NumericTextInputProps, 'onChange'> {
  min?: number;
  max?: number;
  onChange: (newValue: number | undefined) => void;
}

// where Positive is n >=1
export const PositiveNumberInput = React.forwardRef(
  (
    {
      sx,
      disabled = false,
      value,
      min = 1,
      max = NumUtils.MAX_SAFE_API_INTEGER,
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
          onChange(
            value ? NumUtils.constrain(value, Math.max(0, min), max) : undefined
          )
        }
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
