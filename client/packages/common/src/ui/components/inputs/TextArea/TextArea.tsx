import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material/TextField';
import { BasicTextInput } from '../TextInput';

export const TextArea: FC<StandardTextFieldProps> = ({
  value,
  onChange,
  maxRows = 4,
  minRows = 4,
  InputProps,
  ...props
}) => (
  <BasicTextInput
    sx={{ width: '100%' }}
    InputProps={{
      ...InputProps,
      sx: {
        backgroundColor: 'white',
        ...InputProps?.sx,
      },
    }}
    multiline
    value={value}
    onChange={onChange}
    maxRows={maxRows}
    minRows={minRows}
    {...props}
  />
);
