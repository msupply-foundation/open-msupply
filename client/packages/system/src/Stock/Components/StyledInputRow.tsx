import React from 'react';
import {
  InputWithLabelRow,
  InputWithLabelRowProps,
} from '@openmsupply-client/common';

export const INPUT_WIDTH = 160;

export const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: INPUT_WIDTH,
      },
    }}
  />
);
