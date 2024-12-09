import React from 'react';
import { Grid } from '@openmsupply-client/common';

interface PageLayoutProps {
  Left: React.ReactElement;
  Right: React.ReactElement;
}

export const PageLayout = ({ Left, Right }: PageLayoutProps) => {
  return (
    <Grid container spacing={2} direction="row" padding={2} paddingBottom={2}>
      <Grid item xs={3}>
        {Left}
      </Grid>
      <Grid item xs={9}>
        {Right}
      </Grid>
    </Grid>
  );
};
