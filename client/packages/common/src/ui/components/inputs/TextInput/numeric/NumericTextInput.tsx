import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from '../BasicTextInput';
import { NumUtils } from '@common/utils';
export interface NumericTextInputProps
  extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: number | undefined) => void;
  focusOnRender?: boolean;
  width?: number | string;
  min?: number;
  max?: number;
  decimalLimit?: number;
}

export const DEFAULT_NUMERIC_TEXT_INPUT_WIDTH = 75;

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  (
    {
      sx,
      InputProps,
      width = DEFAULT_NUMERIC_TEXT_INPUT_WIDTH,
      onChange,
      min = -Infinity,
      max = Infinity,
      decimalLimit = Infinity,
      ...props
    },
    ref
  ) => (
    <BasicTextInput
      ref={ref}
      sx={{
        '& .MuiInput-input': { textAlign: 'right', width: `${width}px` },
        ...sx,
      }}
      InputProps={InputProps}
      onChange={e => {
        if (e.target.value === '' && !!onChange) {
          onChange(undefined);
          return;
        }
        const parsed = Number(e.target.value);
        if (!Number.isNaN(parsed) && !!onChange)
          onChange(
            NumUtils.constrain(NumUtils.round(parsed, decimalLimit), min, max)
          );
      }}
      onFocus={e => e.target.select()}
      type="number"
      {...props}
    />
  )
);
