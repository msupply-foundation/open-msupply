import React from 'react';
import { rankWith, uiTypeIs, LayoutProps, GroupLayout } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { MaterialLayoutRenderer } from '@jsonforms/material-renderers';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';
import { FORM_LABEL_COLUMN_WIDTH } from '../styleConstants';
import { ChevronDownIcon } from '@common/icons';

export const accordionGroupTester = rankWith(10, uiTypeIs('AccordionGroup'));
const UIComponent = (props: LayoutProps) => {
  const { uischema, schema, visible, renderers, path } = props;

  const layoutProps = {
    elements: (uischema as GroupLayout).elements,
    schema: schema,
    path: path,
    direction: 'column' as 'column' | 'row',
    visible: visible,
    uischema: uischema,
    renderers: renderers,
  };
  if (!props.visible) {
    return null;
  }
  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={2}>
      <Accordion style={{ marginBottom: 10 }}>
        <AccordionSummary
          expandIcon={<ChevronDownIcon />}
          sx={{
            '&:hover .array-remove-icon': { visibility: 'visible' },
            '.MuiAccordionSummary-content': {
              margin: '5px !important',
            },
            '.Mui-expanded': {
              marginBottom: '0 !important',
            },
          }}
          style={{ margin: 0, minHeight: 0 }}
        >
          <Box
            width={FORM_LABEL_COLUMN_WIDTH}
            sx={{
              paddingRight: 0,
            }}
          >
            <Typography
              width={'100%'}
              sx={{
                fontWeight: 'bold',
                textAlign: 'end',
                whiteSpace: 'nowrap',
              }}
            >
              {(uischema as GroupLayout).label}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <MaterialLayoutRenderer {...layoutProps} />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export const AccordionGroup = withJsonFormsLayoutProps(UIComponent);
