import React, { FC } from 'react';
import { Grid } from '@mui/material';

export const DetailContainer: FC = ({ children }) => (
  <Grid container gap={4} padding={4} justifyContent="center">
    {children}
  </Grid>
);
