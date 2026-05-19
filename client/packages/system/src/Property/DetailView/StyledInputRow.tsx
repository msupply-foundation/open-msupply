import React from 'react';
import {
  InputWithLabelRow,
  InputWithLabelRowProps,
} from '@openmsupply-client/common';

export const PROPERTY_INPUT_WIDTH = 220;

// Mirrors `Stock/Components/StyledInputRow` — right-aligned label of fixed
// width and a capped input column. Keeps the form readable across the property
// pages without redefining the row shape per file.
export const PropertyInputRow = ({
  label,
  Input,
  labelWidth,
}: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth={labelWidth ?? '140px'}
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: PROPERTY_INPUT_WIDTH,
      },
    }}
  />
);
