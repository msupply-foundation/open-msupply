import React from 'react';
import { Grid, Typography } from '@openmsupply-client/common';

export const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <Grid spacing={4} container direction="row" paddingBottom={1}>
      <Grid size={6}>
        <Typography variant="body1" fontWeight={700}>
          {label}
        </Typography>
      </Grid>
      <Grid size={3}>
        <Typography variant="body1" style={{ textAlign: 'right' }}>
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface RequestLineEditFormLayoutProps {
  Left: React.ReactElement;
  Middle: React.ReactElement | null;
  Right: React.ReactElement;
  Top: React.ReactElement;
}

export const RequestLineEditFormLayout = ({
  Left,
  Middle,
  Right,
  Top,
}: RequestLineEditFormLayoutProps) => {
  return (
    <Grid
      container
      spacing={2}
      direction="row"
      justifyContent="space-between"
      bgcolor="background.toolbar"
      padding={3}
      paddingBottom={1}
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid size={8} direction="column" justifyContent="space-between">
        <Grid size={12} sx={{ mb: 2 }}>
          {Top}
        </Grid>
        <Grid
          size={12}
          container
          direction="row"
          justifyContent="space-between"
        >
          <Grid
            size={6}
            flexDirection="column"
            display="flex"
            justifyContent="flex-end"
          >
            {Left}
          </Grid>
          <Grid size={6}>{Middle}</Grid>
        </Grid>
      </Grid>
      <Grid size={4}>{Right}</Grid>
    </Grid>
  );
};
