import React, { FC } from 'react';
import { StandardTextFieldProps, SxProps, Theme } from '@mui/material';
import { BasicTextInput } from '../BasicTextInput';
export interface NumericTextInputProps
  extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: number) => void;
  width?: number;
  boxSx?: SxProps<Theme>;
}

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  ({ sx, InputProps, boxSx, width = 75, onChange, ...props }, ref) => (
    <BasicTextInput
      boxSx={boxSx}
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
      onFocus={e => e.target.select()}
      type="number"
      {...props}
    />
  )
);
