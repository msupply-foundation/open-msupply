import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from '../BasicTextInput';

export interface NumericTextInputProps extends StandardTextFieldProps {
  width?: number;
}

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  ({ sx, InputProps, width = 75, ...props }, ref) => (
    <BasicTextInput
      ref={ref}
      sx={{
        '& .MuiInput-input': { textAlign: 'right', width: `${width}px` },
        ...sx,
      }}
      InputProps={InputProps}
      type="number"
      {...props}
    />
  )
);
