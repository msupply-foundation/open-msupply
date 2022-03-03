import React from 'react';
import { Grid, GridProps } from '@mui/material';

export const PanelRow: React.FC<GridProps> = props => (
  <Grid
    container
    sx={{
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
    {...props}
  />
);
