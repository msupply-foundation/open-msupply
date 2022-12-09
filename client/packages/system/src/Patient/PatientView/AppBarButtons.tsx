import React, { FC } from 'react';
import { AppBarButtonsPortal, Grid } from '@openmsupply-client/common';
import { AddButton } from './AddButton';

export const AppBarButtons: FC = () => {
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton />
      </Grid>
    </AppBarButtonsPortal>
  );
};
