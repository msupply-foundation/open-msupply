import React, { FC } from 'react';
import { AppBarContentPortal, Grid } from '@openmsupply-client/common';
import { Statistics } from './Statistics';

interface Toolbar {
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
}

export const Toolbar: FC<Toolbar> = ({ numberOfPacksFromQuantity }) => (
  <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
    <Grid container flexDirection="column">
      <Grid item display="flex" flex={1} gap={1}>
        <Statistics numberOfPacksFromQuantity={numberOfPacksFromQuantity} />
      </Grid>
    </Grid>
  </AppBarContentPortal>
);
