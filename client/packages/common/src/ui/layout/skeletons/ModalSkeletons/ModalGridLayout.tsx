import React from 'react';
import { Grid } from '../..';

interface LayoutProps {
  Top: React.ReactElement;
  Left: React.ReactElement | null;
  Middle: React.ReactElement | null;
  Right: React.ReactElement | null;
  showExtraFields?: boolean;
}

export const ModalGridLayout = ({
  Top,
  Left,
  Middle,
  Right,
  showExtraFields = false,
}: LayoutProps) => {
  return (
    <Grid
      container
      spacing={1}
      direction="row"
      bgcolor="background.toolbar"
      padding={2}
      paddingBottom={1}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {Top}
      </Grid>
      <Grid size={12} container spacing={2}>
        <Grid size={showExtraFields ? 4 : 6}>{Left}</Grid>
        <Grid size={showExtraFields ? 4 : 6}>{Middle}</Grid>
        {showExtraFields && <Grid size={4}>{Right}</Grid>}
      </Grid>
    </Grid>
  );
};
