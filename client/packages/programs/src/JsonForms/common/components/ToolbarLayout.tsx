import React, { FC } from 'react';
import {
  and,
  LayoutProps,
  optionIs,
  RankedTester,
  rankWith,
  uiTypeIs,
  VerticalLayout,
} from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Grid, AppBarContentPortal } from '@openmsupply-client/common';
import {
  AjvProps,
  renderLayoutElements,
  withAjvProps,
} from '@jsonforms/material-renderers';

export const toolbarLayoutTester: RankedTester = rankWith(
  2,
  and(uiTypeIs('VerticalLayout'), optionIs('variant', 'toolbar'))
);

const UIComponent: FC<LayoutProps & AjvProps> = ({
  path,
  renderers,
  schema,
  uischema,
  cells,
}) => {
  const layout = uischema as VerticalLayout;

  const enabled = true;

  return (
    <AppBarContentPortal>
      <Grid
        display="flex"
        justifyContent="center"
        alignContent="center"
        flex={1}
        flexWrap="wrap"
        gap={2}
        padding={2}
      >
        {renderLayoutElements(
          layout.elements,
          schema,
          path,
          enabled,
          renderers,
          cells
        )}
      </Grid>
    </AppBarContentPortal>
  );
};

export const ToolbarLayout = withJsonFormsLayoutProps(
  withAjvProps(UIComponent)
);
