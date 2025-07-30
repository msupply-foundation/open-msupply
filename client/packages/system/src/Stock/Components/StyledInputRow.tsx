import React from 'react';
import {
  InputWithLabelRow,
  InputWithLabelRowProps,
} from '@openmsupply-client/common';

export const INPUT_WIDTH = 160;

export const StyledInputRow = ({
  label,
  Input,
  labelWidth,
}: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth={labelWidth ?? '100px'}
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: INPUT_WIDTH,
      },
    }}
  />
);
