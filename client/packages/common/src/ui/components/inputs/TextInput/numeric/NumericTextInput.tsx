import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from '../BasicTextInput';
export interface NumericTextInputProps
  extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: number) => void;
  width?: number;
}

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  ({ sx, InputProps, width = 75, onChange, ...props }, ref) => (
    <BasicTextInput
      ref={ref}
      sx={{
        '& .MuiInput-input': { textAlign: 'right', width: `${width}px` },
        ...sx,
      }}
      InputProps={InputProps}
      onChange={e => {
        const parsed = Number(e.target.value);
        if (!Number.isNaN(parsed) && !!onChange) onChange(parsed);
      }}
      type="number"
      {...props}
    />
  )
);
