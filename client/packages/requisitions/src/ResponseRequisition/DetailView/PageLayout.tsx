import React from 'react';
import { Grid } from 'packages/common/src';

interface PageLayoutProps {
  Left: React.ReactElement;
  Right: React.ReactElement;
}

export const PageLayout = ({ Left, Right }: PageLayoutProps) => {
  return (
    <Grid container spacing={2} direction="row" padding={2} paddingBottom={2}>
      <Grid item xs={4}>
        {Left}
      </Grid>
      <Grid item xs={6}>
        {Right}
      </Grid>
    </Grid>
  );
};
