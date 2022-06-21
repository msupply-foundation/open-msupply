import React, { useMemo } from 'react';
import {
  rankWith,
  schemaTypeIs,
  ControlProps,
  uiTypeIs,
  LayoutProps,
  ArrayLayoutProps,
  ArrayControlProps,
  findUISchema,
  findMatchingUISchema,
} from '@jsonforms/core';
import {
  JsonFormsInitStateProps,
  withJsonFormsControlProps,
  withJsonFormsArrayLayoutProps,
  withJsonFormsLayoutProps,
  withJsonFormsArrayControlProps,
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
import { RegexUtils } from '@common/utils';

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const UIComponent = (props: ArrayControlProps) => {
  const {
    uischema,
    uischemas,
    schema,
    path,
    data,
    errors,
    addItem,
    childErrors,
    enabled,
    label,
    rootSchema,
  } = props;

  const foundUISchema = useMemo(() =>
    findUISchema(
      uischemas,
      schema,
      uischema.scope,
      path,
      undefined,
      uischema,
      rootSchema
    )
  );

  console.log('keyField', uischema.keyField);
  console.log('data', data);

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
            onClick={() => addItem(path, null)}
          />
        </Box>
      </Box>
      {data.map((child, index) => {
        return (
          <Accordion key={index} defaultExpanded={index === 0} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography
                width="40%"
                sx={{ fontWeight: 'bold', textAlign: 'end' }}
              >
                {child?.[uischema?.keyField]
                  ? RegexUtils.stringSubstitution(child?.[uischema?.keyField])
                  : index + 1}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <JsonFormsDispatch
                key={index}
                schema={schema}
                uischema={foundUISchema}
                enabled={enabled}
                path={`${path}.${index}`}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export const Array = withJsonFormsArrayControlProps(UIComponent);
