import React from 'react';
import { Grid } from '@openmsupply-client/common';

interface PageLayoutProps {
  Left: React.ReactElement;
  Right: React.ReactElement;
}

export const PageLayout = ({ Left, Right }: PageLayoutProps) => {
  return (
    <Grid container spacing={2} direction="row" sx={{ maxHeight: '100%' }}>
      <Grid
        item
        xs={4}
        sx={{ maxHeight: '100%', overflow: 'auto', scrollBehavior: 'smooth' }}
      >
        {Left}
      </Grid>
      <Grid item xs={6}>
        {Right}
      </Grid>
    </Grid>
  );
};
