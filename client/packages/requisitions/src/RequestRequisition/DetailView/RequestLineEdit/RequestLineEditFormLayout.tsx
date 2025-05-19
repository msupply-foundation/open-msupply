import React from 'react';
import { Grid, Typography } from '@openmsupply-client/common';

export const InfoRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => {
  return (
    <Grid
      container
      spacing={1}
      marginBottom={1}
      borderRadius={2}
      padding={'0px 8px'}
      sx={{
        background: theme =>
          highlight ? theme.palette.background.group : 'inherit',
      }}
    >
      <Grid size={6}>
        <Typography variant="body1" fontWeight={700}>
          {label}:
        </Typography>
      </Grid>
      <Grid size={6} textAlign="right">
        <Typography
          variant="body1"
          style={{
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface RequestLineEditFormLayoutProps {
  Top: React.ReactElement;
  Left: React.ReactElement;
  Middle: React.ReactElement | null;
  Right: React.ReactElement;
}

export const RequestLineEditFormLayout = ({
  Top,
  Left,
  Middle,
  Right,
}: RequestLineEditFormLayoutProps) => {
  return (
    <Grid
      container
      spacing={1}
      direction="row"
      bgcolor="background.toolbar"
      padding={2}
      paddingBottom={1}
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {Top}
      </Grid>
      <Grid size={12} container spacing={2}>
        <Grid size={4}>{Left}</Grid>
        <Grid size={4}>{Middle}</Grid>
        <Grid
          size={4}
          sx={{
            background: theme => theme.palette.background.group,
            padding: '0px 8px',
            borderRadius: 2,
          }}
        >
          {Right}
        </Grid>
      </Grid>
    </Grid>
  );
};
