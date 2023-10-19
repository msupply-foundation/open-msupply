import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from '../BasicTextInput';
import { NumUtils } from '@common/utils';
export interface NumericTextInputProps
  extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: number | undefined) => void;
  width?: number | string;
  defaultValue?: number;
  integer?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  decimalPrecision?: number;
}

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  (
    {
      sx,
      InputProps,
      width = 75,
      onChange,
      defaultValue,
      integer = false,
      allowNegative,
      min,
      max = Infinity,
      decimalPrecision = Infinity,
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
          // cleanInput(e.target.value, true, true);
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
              NumUtils.constrain(
                NumUtils.round(parsed, integer ? 0 : decimalPrecision),
                allowNegative === undefined && min && min < 0
                  ? min
                  : Math.max(min ?? -Infinity, 0),
                max
              )
            );
        }}
        onFocus={e => e.target.select()}
        type="number"
        {...props}
      />
    );
  }
);

// // Strips out illegal characters before input is allowed
// const cleanInput = (
//   input: string,
//   allowNegative: boolean,
//   allowDecimal: boolean
// ) => {
//   console.log('input', input);
//   const regex = new RegExp(
//     `^${allowNegative ? '-?' : ''}\\d*${allowDecimal ? '\\.?' : ''}\\d*$`
//   );

//   console.log(input.match(regex));
// };
