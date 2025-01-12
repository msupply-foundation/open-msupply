import React from 'react';
import { Grid } from '@openmsupply-client/common';

interface PageLayoutProps {
  Left: React.ReactElement;
  Right: React.ReactElement;
}

export const PageLayout = ({ Left, Right }: PageLayoutProps) => {
  return (
    <Grid container spacing={2} direction="row" sx={{ maxHeight: '100%' }}>
      <Grid size={{ xs: 3 }}>{Left}</Grid>
      <Grid size={{ xs: 9 }}>{Right}</Grid>
    </Grid>
  );
};
