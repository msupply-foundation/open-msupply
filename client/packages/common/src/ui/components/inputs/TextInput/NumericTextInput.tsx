import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';
import { NumUtils } from '@common/utils';
export interface NumericTextInputProps
  extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: number | undefined) => void;
  width?: number | string;
  defaultValue?: number;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  precision?: number;
}

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  (
    {
      sx,
      InputProps,
      width = 75,
      onChange,
      defaultValue,
      allowNegative,
      min = allowNegative ? -NumUtils.MAX_SAFE_API_INTEGER : 0,
      max = NumUtils.MAX_SAFE_API_INTEGER,
      precision = 0,
      ...props
    },
    ref
  ) => {
    return (
      <BasicTextInput
        ref={ref}
        sx={{
          '& .MuiInput-input': { textAlign: 'right', width: `${width}px` },
          ...sx,
        }}
        InputProps={InputProps}
        onChange={e => {
          if (
            (e.target.value === '' || e.target.value === undefined) &&
            !!onChange
          ) {
            onChange(defaultValue);
            return;
          }
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed) && !!onChange)
            onChange(
              NumUtils.constrain(NumUtils.round(parsed, precision), min, max)
            );
        }}
        onFocus={e => e.target.select()}
        type="number"
        {...props}
      />
    );
  }
);
