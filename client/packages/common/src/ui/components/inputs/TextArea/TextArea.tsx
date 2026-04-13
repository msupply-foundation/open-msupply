import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material/TextField';
import { BasicTextInput } from '../TextInput';
import { merge } from '@common/utils';

export const TextArea: FC<StandardTextFieldProps> = ({
  value,
  onChange,
  maxRows = 4,
  minRows = 4,
  slotProps,
  rows,
  ...props
}) => (
  <BasicTextInput
    sx={{ width: '100%' }}
    slotProps={{
      input: merge(
        {
          sx: {
            backgroundColor: 'background.white',
          },
        },
        slotProps?.input as Record<string, any>
      ),
    }}
    multiline
    value={value}
    onChange={onChange}
    maxRows={rows ? undefined : maxRows}
    minRows={rows ? undefined : minRows}
    rows={rows}
    {...props}
  />
);
