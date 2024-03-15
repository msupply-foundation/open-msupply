import React, { FC } from 'react';
import { Grid } from '@mui/material';
import { PropsWithChildrenOnly } from '@common/types';

export const DetailContainer: FC<
  PropsWithChildrenOnly & { paddingTop?: number }
> = ({ children, paddingTop }) => (
  <Grid
    container
    gap={4}
    padding={4}
    paddingTop={paddingTop}
    justifyContent="center"
  >
    {children}
  </Grid>
);
