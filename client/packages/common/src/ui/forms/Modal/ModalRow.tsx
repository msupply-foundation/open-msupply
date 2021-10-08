import { Grid } from '@mui/material';
import React from 'react';

export const ModalRow: React.FC = ({ children }) => (
  <Grid xs={12} container>
    {children}
  </Grid>
);
