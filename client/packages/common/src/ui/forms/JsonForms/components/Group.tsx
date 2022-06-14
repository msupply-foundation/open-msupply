import React from 'react';
import { rankWith, uiTypeIs, LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { MaterialLayoutRenderer } from '@jsonforms/material-renderers';
import { Box, Typography } from '@mui/material';

export const groupTester = rankWith(4, uiTypeIs('Group'));

const UIComponent = (props: LayoutProps) => {
  const { uischema, schema, visible, renderers, path } = props;
  //   console.log('props', props);

  const layoutProps = {
    elements: uischema.elements,
    schema: schema,
    path: path,
    direction: 'column' as 'column' | 'row',
    visible: visible,
    uischema: uischema,
    renderers: renderers,
  };
  return (
    <Box
      sx={{
        maxWidth: 500,
        paddingLeft: 2,
        paddingRight: 2,
        marginBottom: 2,
      }}
    >
      <Typography width="40%" fontSize="1.2em" textAlign="right">
        <strong>{uischema.label}</strong>
      </Typography>
      <MaterialLayoutRenderer {...layoutProps} />
    </Box>
  );
};

export const Group = withJsonFormsLayoutProps(UIComponent);
