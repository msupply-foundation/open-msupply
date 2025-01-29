import React, { FC } from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import { Grid } from '@openmsupply-client/common';

export const DetailContainer: FC<
  PropsWithChildrenOnly & { paddingTop?: number }
> = ({ children, paddingTop }) => (
  <Grid
    container
    width="100%"
    gap={4}
    padding={4}
    paddingTop={paddingTop}
    justifyContent="center"
  >
    {children}
  </Grid>
);
