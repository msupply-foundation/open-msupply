import React, { FC } from 'react';
import { AppBarContentPortal, Grid } from '@openmsupply-client/common';

export const Toolbar: FC = () => {
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container>
        <Grid
          item
          display="flex"
          flex={1}
          flexDirection="column"
          gap={1}
        ></Grid>
        <Grid
          item
          flexDirection="column"
          alignItems="flex-end"
          display="flex"
          gap={2}
        ></Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
