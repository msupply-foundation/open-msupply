import React from 'react';
import Grid, { GridProps } from '@mui/material/Grid';

export const PanelLabel: React.FC<GridProps> = props => (
  <Grid
    item
    flex={2}
    {...props}
    sx={{
      color: theme => theme.palette.form.label,
      fontSize: '12px',
    }}
  />
);
