import React from 'react';
import { AppBarContentPortal, Grid } from '@openmsupply-client/common';

export const Toolbar = () => {
  return (
    <AppBarContentPortal sx={{ width: '100%' }}>
      <Grid
        container
        sx={{
          display: 'flex',
          justifyContent: 'end',
          marginBottom: 1,
        }}
      ></Grid>
    </AppBarContentPortal>
  );
};
