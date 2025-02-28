import React from 'react';
import { Grid } from '@openmsupply-client/common';

interface PageLayoutProps {
  Left: React.ReactElement;
  Right: React.ReactElement;
}

export const LineEditPageLayout = ({ Left, Right }: PageLayoutProps) => {
  return (
    <Grid
      container
      spacing={2}
      direction="row"
      padding={3}
      paddingTop={2}
      width="100%"
    >
      <Grid size={{ xs: 3 }}>{Left}</Grid>
      <Grid size={{ xs: 9 }}>{Right}</Grid>
    </Grid>
  );
};
