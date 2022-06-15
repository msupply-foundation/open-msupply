import React from 'react';
import { rankWith, schemaTypeIs, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
// import { MaterialRe } from '@jsonforms/material-renderers';
import ExpandPanelRenderer from '@jsonforms/material-renderers/src/layouts/ExpandPanelRenderer';
import { FormLabel, Box } from '@mui/material';

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const UIComponent = (props: ControlProps) => {
  const {
    data,
    uischema,
    uischemas,
    handleChange,
    label,
    schema,
    path,
    renderers,
    rootSchema,
    cells,
    config,
  } = props;

  console.log('uischema', uischema);
  console.log('data', data);

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={0.5}
    >
      <Box flex={1} style={{ textAlign: 'end' }} flexBasis="40%">
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <p>This is an array</p>
      {data.map((item, index) => (
        <p>Testing</p>
      ))}
      {/* <Box flex={1} flexBasis="60%">
        <Select
          sx={{ minWidth: 100 }}
          options={options}
          value={data}
          onChange={e => handleChange(path, e.target.value)}
        />
      </Box> */}
    </Box>
  );
};

export const Array = withJsonFormsControlProps(UIComponent);
