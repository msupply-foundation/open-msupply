import React from 'react';
import { rankWith, isEnumControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Autocomplete } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const selectTester = rankWith(4, isEnumControl);

type Option = { label: string; value: string };

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, schema, path } = props;

  const options = schema.enum
    ? schema.enum.map((option: string) => ({
        label: option,
        value: option,
      }))
    : [];

  const onChange = (_event: React.SyntheticEvent, value: Option | null) =>
    handleChange(path, value?.value);

  if (!props.visible) {
    return null;
  }
  const value = data ? options.find(o => o.value === data) : null;

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
        <Autocomplete
          sx={{ '.MuiFormControl-root': { minWidth: '135px' } }}
          options={options}
          value={value}
          onChange={onChange}
          clearable={!!props.config?.required}
          inputProps={{
            error: !!props.errors,
            helperText: props.errors,
          }}
          isOptionEqualToValue={option => option.value === data}
        />
      </Box>
    </Box>
  );
};

export const Selector = withJsonFormsControlProps(UIComponent);
