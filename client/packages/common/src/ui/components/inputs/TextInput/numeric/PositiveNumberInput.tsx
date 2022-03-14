import React, { ForwardedRef } from 'react';
import { NumericTextInput } from '@common/components';
import { NumUtils } from '@common/utils';
import { NumericTextInputProps } from './NumericTextInput';

interface PositiveNumberProps extends Omit<NumericTextInputProps, 'onChange'> {
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
      max = 999999999,
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
        onChange={e => {
          const newValue = NumUtils.parseString(e.target.value, 1, max);
          onChange(newValue);
        }}
        disabled={disabled}
        value={value}
        {...rest}
      />
    );
  }
);
