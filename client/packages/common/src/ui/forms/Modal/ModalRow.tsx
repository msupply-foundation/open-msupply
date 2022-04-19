import { Grid } from '@mui/material';
import React from 'react';
interface ModalRowProps {
  children?: React.ReactNode;
  margin?: number;
}

export const ModalRow: React.FC<ModalRowProps> = ({ children, margin }) => (
  <Grid container style={{ marginTop: margin, marginBottom: margin }}>
    {children}
  </Grid>
);
