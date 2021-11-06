import React from 'react';
import { Grid } from '@mui/material';

export const PanelRow: React.FC = props => (
  <Grid container sx={{ alignItems: 'center' }} {...props} />
);
