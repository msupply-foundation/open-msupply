import React from 'react';
import { rankWith, isBooleanControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Switch } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const booleanTester = rankWith(4, isBooleanControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, enabled } = props;

  if (!props.visible) {
    return null;
  }
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      sx={{ margin: 0.5, marginLeft: 0, gap: 2 }}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <Switch
          labelPlacement="end"
          onChange={(_, checked) => {
            handleChange(path, checked);
          }}
          value={data ?? ''}
          checked={data}
          disabled={!enabled}
        />
      </Box>
    </Box>
  );
};

export const BooleanField = withJsonFormsControlProps(UIComponent);
