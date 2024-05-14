import React from 'react';

import { AppBarButtonsPortal, Grid } from '@openmsupply-client/common';

export const AppBarButtonsComponent = () => {
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}></Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
