import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
} from '@openmsupply-client/common';
import { CreateShipmentButton } from './CreateShipmentButton';

export const AppBarButtonsComponent = () => {
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <CreateShipmentButton />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
