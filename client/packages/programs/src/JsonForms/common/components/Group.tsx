import React from 'react';
import { rankWith, uiTypeIs, LayoutProps, GroupLayout } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { MaterialLayoutRenderer } from '@jsonforms/material-renderers';
import {
  Box,
  LocaleKey,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

export const groupTester = rankWith(4, uiTypeIs('Group'));

const UIComponent = (props: LayoutProps) => {
  const { uischema, schema, visible, renderers, path, enabled } = props;
  const t = useTranslation();

  const layoutProps = {
    elements: (uischema as GroupLayout).elements,
    schema: schema,
    path: path,
    direction: 'column' as 'column' | 'row',
    visible: visible,
    uischema: uischema,
    renderers: renderers,
    enabled,
  };
  if (!props.visible) {
    return null;
  }

  const label = (uischema as GroupLayout).label;

  if (!label) {
    // without label just return the normal layout
    return <MaterialLayoutRenderer {...layoutProps} />;
  }
  return (
    <Box>
      <Typography
        variant="subtitle1"
        width={'100%'}
        textAlign="left"
        marginBottom={1}
        paddingBottom={1}
        paddingTop={3}
      >
        <strong>{t(label as LocaleKey)}</strong>
      </Typography>
      <MaterialLayoutRenderer {...layoutProps} />
    </Box>
  );
};

export const Group = withJsonFormsLayoutProps(UIComponent);
