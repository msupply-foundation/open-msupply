import React from 'react';
import {
  rankWith,
  isEnumControl,
  ControlProps,
  isDateControl,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Select, BaseDatePickerInput } from '@openmsupply-client/common';

export const dateTester = rankWith(5, isDateControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, schema, path } = props;

  const options = schema.enum
    ? schema.enum.map((option: string) => ({
        label: option,
        value: option,
      }))
    : [];

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box flex={1} style={{ textAlign: 'end' }} flexBasis="40%">
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flex={1} flexBasis="60%">
        <BaseDatePickerInput
          value={data}
          onChange={e => handleChange(path, e)}
          inputFormat="dd/MM/yyyy"
        />
      </Box>
    </Box>
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
