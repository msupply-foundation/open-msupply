import React from 'react';
import { Grid } from '@mui/material';

export const PanelLabel: React.FC = props => (
  <Grid
    item
    flex={1}
    {...props}
    sx={{
      color: theme => theme.palette.form.label,
      fontSize: '12px',
    }}
  />
);
