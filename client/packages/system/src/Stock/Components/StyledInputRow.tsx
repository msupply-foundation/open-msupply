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
  testId,
}: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    testId={testId}
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
