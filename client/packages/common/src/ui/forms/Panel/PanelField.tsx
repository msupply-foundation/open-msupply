import React from 'react';
import { Grid } from '@mui/material';

export const PanelField: React.FC<{ children?: React.ReactNode }> = props => (
  <Grid
    item
    flex={1}
    {...props}
    sx={{
      color: theme => theme.palette.gray.main,
      textAlign: 'right',
      fontSize: '12px',
    }}
  />
);
