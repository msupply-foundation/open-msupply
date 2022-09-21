import React from 'react';
import { rankWith, isEnumControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Select } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const selectTester = rankWith(4, isEnumControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, schema, path } = props;

  const options = schema.enum
    ? schema.enum.map((option: string) => ({
        label: option,
        value: option,
      }))
    : [];

  if (!props.visible) {
    return null;
  }
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <Select
          sx={{ minWidth: 100 }}
          options={options}
          value={data ?? ''}
          onChange={e => handleChange(path, e.target.value)}
          error={!!props.errors}
          clearable
          helperText={props.errors}
        />
      </Box>
    </Box>
  );
};

export const Selector = withJsonFormsControlProps(UIComponent);
