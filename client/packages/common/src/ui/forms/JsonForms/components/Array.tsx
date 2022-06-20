import React, { useMemo } from 'react';
import {
  rankWith,
  schemaTypeIs,
  ControlProps,
  uiTypeIs,
  LayoutProps,
} from '@jsonforms/core';
import {
  JsonFormsInitStateProps,
  withJsonFormsControlProps,
  withJsonFormsLayoutProps,
  JsonFormsDispatch,
} from '@jsonforms/react';
import { JsonForms } from '@jsonforms/react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconButton, PlusCircleIcon } from '@openmsupply-client/common';

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const UIComponent = (props: LayoutProps) => {
  const { uischema, schema, path, enabled } = props;

  const addItem = () => {
    // To do: update data
  };

  // console.log('Data', data);
  // console.log('schema', schema);
  // console.log('UiSchema', uischema);
  // console.log('path', path);
  // console.log('All props', props);

  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      <Box display="flex" width="100%" gap={2} alignItems="center">
        <Box width="40%">
          <Typography sx={{ fontWeight: 'bold', textAlign: 'end' }}>
            TEMP:
          </Typography>
        </Box>
        <Box width="60%" textAlign="right">
          <IconButton
            icon={<PlusCircleIcon />}
            label="Add another"
            color="primary"
            onClick={addItem}
          />
          {uischema.options.detail.elements.map((child, index) => {
            console.log('child', child);
            console.log('schema', schema);
            return (
              <JsonFormsDispatch
                key={index}
                schema={schema}
                uischema={child}
                enabled
                path={path}
              />
            );
          })}
        </Box>
      </Box>
      <p>Hang on</p>
    </Box>
  );
};

export const Array = withJsonFormsLayoutProps(UIComponent);
