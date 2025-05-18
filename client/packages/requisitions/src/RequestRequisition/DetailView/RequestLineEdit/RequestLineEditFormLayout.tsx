import React from 'react';
import { Grid, Typography } from '@openmsupply-client/common';

export const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Grid container spacing={1} marginBottom={1} paddingRight={1}>
    <Grid size={6}>
      <Typography variant="body1" fontWeight={700}>
        {label}:
      </Typography>
    </Grid>
    <Grid size={6} textAlign="right">
      <Typography variant="body1" style={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Grid>
  </Grid>
);

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
      bgcolor="background.toolbar"
      padding={3}
      paddingBottom={1}
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {Top}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={4}>{Left}</Grid>
        <Grid size={4}>{Middle}</Grid>
        <Grid size={4}>{Right}</Grid>
      </Grid>
    </Grid>
  );
};
