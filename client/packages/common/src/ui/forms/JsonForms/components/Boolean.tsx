import React, { useState } from 'react';
import { rankWith, isBooleanControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Switch, useDebounceCallback } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const booleanTester = rankWith(4, isBooleanControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const [localData, setLocalData] = useState<boolean | undefined>(data);
  const onChange = useDebounceCallback(
    (value: boolean) => handleChange(path, value),
    [path]
  );
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={0.5}
    >
      <Box
        flex={1}
        style={{ textAlign: 'end' }}
        flexBasis={FORM_LABEL_COLUMN_WIDTH}
      >
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flex={1} flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <Switch
          labelPlacement="end"
          onChange={(_, checked) => {
            setLocalData(checked);
            onChange(checked);
          }}
          value={localData}
          checked={localData}
        />
      </Box>
    </Box>
  );
};

export const BooleanField = withJsonFormsControlProps(UIComponent);
