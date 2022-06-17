import React, { useMemo } from 'react';
import { rankWith, schemaTypeIs, ControlProps } from '@jsonforms/core';
import {
  JsonFormsInitStateProps,
  withJsonFormsControlProps,
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

const UIComponent = (props: ControlProps) => {
  const {
    data,
    handleChange,
    label,
    path,
    renderers,
    // schema,
    // uischema,
    // rootSchema,
  } = props;

  const addItem = () => {
    console.log('Current data', data);
    const newData = [...data, data[0]];
    console.log('New data', newData);
    handleChange(path, [...data, data[0]]);
  };

  const formObjects = useMemo(
    () =>
      data.map(
        (value: any, index: number) =>
          ({
            data: value,
            renderers,
            onChange: ({ data }: { data: any }) => {
              handleChange(`${path}[${index}]`, data);
            },
          } as JsonFormsInitStateProps)
      ),
    [data]
  );

  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      <Box display="flex" width="100%" gap={2} alignItems="center">
        <Box width="40%">
          <Typography sx={{ fontWeight: 'bold', textAlign: 'end' }}>
            {label}:
          </Typography>
        </Box>
        <Box width="60%" textAlign="right">
          <IconButton
            icon={<PlusCircleIcon />}
            label="Add another"
            color="primary"
            onClick={addItem}
          />
        </Box>
      </Box>
      {formObjects.map((formObject: any, index: number) => {
        return (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{label}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <JsonForms {...formObject} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export const Array = withJsonFormsControlProps(UIComponent);
